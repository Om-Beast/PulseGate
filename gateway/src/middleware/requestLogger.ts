import { Request, Response, NextFunction } from 'express';
import { logger } from '../logging/logger';

/**
 * Request Logger Middleware
 *
 * Logs a structured record when each response is finished.
 * Uses res.on('finish') to capture the final status code and timing.
 *
 * Logs include: requestId, method, path, statusCode, latencyMs
 * Optional: service and instance from res.locals (set by proxyRequest)
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  res.on('finish', () => {
    const latencyMs = Date.now() - startTime;

    logger.info('request completed', {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      latencyMs,
      service: (res.locals.service as string | undefined) ?? '-',
      instance: (res.locals.instance as string | undefined) ?? '-',
      userAgent: req.headers['user-agent'],
    });
  });

  next();
}
