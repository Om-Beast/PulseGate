import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import * as http from 'http';

import { correlationId } from './middleware/correlationId';
import { requestLogger } from './middleware/requestLogger';
import { requireAuth, requireAdmin } from './middleware/auth';
import { applyRateLimit } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';

import { register, login } from './auth/authController';
import { resolveRoute, ROUTE_CONFIG } from './config/routes';
import { backendRegistry } from './registry/backendRegistry';
import { roundRobinLB } from './loadBalancer/roundRobin';
import { metrics } from './metrics/metricsCollector';
import { logger } from './logging/logger';
import {
  routeNotFound,
  serviceUnavailable,
  requestTimeout,
  internalError,
} from './errors/gatewayError';
import { ServiceInstance } from './types';
import { config } from './config/settings';

// ─── Create Express App ────────────────────────────────────────────────────────

const app = express();

// ─── Security & Body Parsing ───────────────────────────────────────────────────

app.use(helmet());
app.use(
  cors({
    origin: '*',
    exposedHeaders: ['X-Request-Id', 'X-RateLimit-Remaining', 'Retry-After'],
  }),
);
app.use(express.json({ limit: '1mb' }));

// ─── Core Middleware ───────────────────────────────────────────────────────────

app.use(correlationId);
app.use(requestLogger);

// ─── Public Routes ─────────────────────────────────────────────────────────────

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'pulsegate-gateway' });
});

app.post('/auth/register', register);
app.post('/auth/login', login);

// ─── Admin Routes (ADMIN role only) ───────────────────────────────────────────

app.get('/admin/services', requireAuth, requireAdmin, (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: backendRegistry.getAllInstances(),
  });
});

app.get('/admin/routes', requireAuth, requireAdmin, (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: ROUTE_CONFIG,
  });
});

app.get('/admin/metrics', requireAuth, requireAdmin, (_req: Request, res: Response) => {
  const m = metrics.getMetrics();

  // Enrich with live backend health state
  const allInstances = backendRegistry.getAllInstances();
  const backendHealth: Record<string, boolean> = {};
  for (const inst of allInstances) {
    backendHealth[inst.id] = inst.healthy;
  }
  m.backendHealth = backendHealth;

  res.json({ success: true, data: m });
});

app.get('/admin/requests', requireAuth, requireAdmin, (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: metrics.getRecentRequests(),
  });
});

// ─── Protected API Routes ──────────────────────────────────────────────────────

app.use(
  '/api',
  requireAuth,
  applyRateLimit,
  async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    // Resolve route from path (strip /api prefix already handled by resolveRoute)
    const fullPath = '/api' + req.path;
    const route = resolveRoute(fullPath);

    if (!route) {
      return next(routeNotFound(fullPath).withRequestId(req.requestId));
    }

    const allInstances = backendRegistry.getHealthyInstances(route.service);

    if (allInstances.length === 0) {
      logger.warn('No healthy instances available', {
        requestId: req.requestId,
        service: route.service,
      });
      return next(serviceUnavailable(route.service).withRequestId(req.requestId));
    }

    const instance = roundRobinLB.selectInstance(route.service, allInstances);

    if (!instance) {
      return next(serviceUnavailable(route.service).withRequestId(req.requestId));
    }

    // Attempt proxy with one retry for safe methods
    const isSafeMethod = ['GET', 'HEAD', 'OPTIONS'].includes(req.method.toUpperCase());

    try {
      await proxyRequest(req, res, instance, route.strip, startTime);
    } catch (err) {
      // On failure, retry once with a different instance for safe methods
      if (isSafeMethod) {
        const remainingInstances = allInstances.filter((i) => i.id !== instance.id);
        const retryInstance = roundRobinLB.selectInstance(route.service, remainingInstances);

        if (retryInstance) {
          logger.info('Retrying request on different instance', {
            requestId: req.requestId,
            originalInstance: instance.id,
            retryInstance: retryInstance.id,
          });

          try {
            await proxyRequest(req, res, retryInstance, route.strip, startTime);
            return;
          } catch (retryErr) {
            return next(retryErr);
          }
        }
      }

      next(err);
    }
  },
);

// ─── 404 Handler ──────────────────────────────────────────────────────────────

app.use((req: Request, _res: Response, next: NextFunction) => {
  next(routeNotFound(req.path).withRequestId(req.requestId));
});

// ─── Error Handler ─────────────────────────────────────────────────────────────

app.use(errorHandler);

// ─── Proxy Implementation ─────────────────────────────────────────────────────

/**
 * Forward the incoming request to a backend instance using Node's built-in http module.
 *
 * Headers forwarded:
 * - Original request headers (sanitized: no Authorization, no hop-by-hop)
 * - X-Request-Id (correlation)
 * - X-User-Id and X-User-Role (set by gateway after authentication)
 *
 * Headers NOT forwarded:
 * - Authorization (prevent credential leakage to backends)
 * - X-User-Id and X-User-Role from client (always overwritten by gateway)
 */
async function proxyRequest(
  req: Request,
  res: Response,
  instance: ServiceInstance,
  stripPrefix: string,
  startTime: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Build the target path: strip prefix and reconstruct
    const targetPath = req.originalUrl.replace(/^\/api/, '') || '/';

    // Sanitize headers
    const headersToForward: Record<string, string> = {};

    // Copy safe headers from original request
    const BLOCKED_HEADERS = new Set([
      'authorization',
      'x-user-id',
      'x-user-role',
      'host',
      'connection',
      'keep-alive',
      'transfer-encoding',
      'te',
      'trailers',
      'upgrade',
      'proxy-authorization',
      'proxy-authenticate',
    ]);

    for (const [key, value] of Object.entries(req.headers)) {
      if (!BLOCKED_HEADERS.has(key.toLowerCase()) && value !== undefined) {
        headersToForward[key] = Array.isArray(value) ? value.join(', ') : value;
      }
    }

    // Set gateway-injected headers
    headersToForward['x-request-id'] = req.requestId;

    if (req.user) {
      headersToForward['x-user-id'] = req.user.userId;
      headersToForward['x-user-role'] = req.user.role;
    }

    // Prepare body
    const bodyChunks: Buffer[] = [];
    let bodyStr = '';

    if (req.body && Object.keys(req.body).length > 0) {
      bodyStr = JSON.stringify(req.body);
      headersToForward['content-type'] = 'application/json';
      headersToForward['content-length'] = Buffer.byteLength(bodyStr).toString();
    }

    const options: http.RequestOptions = {
      hostname: instance.host,
      port: instance.port,
      path: targetPath,
      method: req.method,
      headers: headersToForward,
      timeout: config.gateway.timeout,
    };

    const proxyReq = http.request(options, (proxyRes) => {
      // Set response headers (excluding hop-by-hop)
      for (const [key, value] of Object.entries(proxyRes.headers)) {
        if (value !== undefined && key.toLowerCase() !== 'transfer-encoding') {
          res.setHeader(key, value);
        }
      }

      res.statusCode = proxyRes.statusCode ?? 200;
      res.setHeader('x-proxied-by', 'pulsegate');

      // Set locals for request logger
      res.locals.service = instance.service;
      res.locals.instance = instance.id;

      const responseChunks: Buffer[] = [];

      proxyRes.on('data', (chunk: Buffer) => responseChunks.push(chunk));

      proxyRes.on('end', () => {
        const responseBody = Buffer.concat(responseChunks);
        const latencyMs = Date.now() - startTime;

        // Record metrics
        metrics.recordRequest({
          requestId: req.requestId,
          method: req.method,
          path: req.path,
          status: res.statusCode,
          latencyMs,
          service: instance.service,
          instance: instance.id,
        });

        res.end(responseBody);
        resolve();
      });

      proxyRes.on('error', (err) => {
        reject(internalError(`Backend response error: ${err.message}`));
      });
    });

    proxyReq.on('timeout', () => {
      proxyReq.destroy();
      backendRegistry.markUnhealthy(instance.id);
      metrics.recordBackendFailure(instance.id);
      logger.warn('Backend request timed out', {
        requestId: req.requestId,
        instanceId: instance.id,
        service: instance.service,
      });
      reject(requestTimeout().withRequestId(req.requestId));
    });

    proxyReq.on('error', (err: NodeJS.ErrnoException) => {
      backendRegistry.markUnhealthy(instance.id);
      metrics.recordBackendFailure(instance.id);
      logger.error('Backend connection failed', {
        requestId: req.requestId,
        instanceId: instance.id,
        service: instance.service,
        error: err.message,
        code: err.code,
      });
      reject(serviceUnavailable(instance.service).withRequestId(req.requestId));
    });

    // Write body if present
    if (bodyStr) {
      proxyReq.write(bodyStr);
    }

    proxyReq.end();
  });
}

export default app;
