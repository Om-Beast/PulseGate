import { Request } from 'express';

// ─── JWT & Auth ────────────────────────────────────────────────────────────────

export interface JwtPayload {
  userId: string;
  role: 'USER' | 'ADMIN' | 'PREMIUM';
}

export interface AuthUser {
  userId: string;
  role: 'USER' | 'ADMIN' | 'PREMIUM';
}

// ─── Backend Registry ──────────────────────────────────────────────────────────

export interface ServiceInstance {
  id: string;
  service: string;
  host: string;
  port: number;
  healthy: boolean;
  lastChecked: Date;
  failureCount: number;
  recoveryCount: number;
}

// ─── Routing ───────────────────────────────────────────────────────────────────

export interface RouteConfig {
  service: string;
  strip: string;
}

// ─── Error Codes ───────────────────────────────────────────────────────────────

export type GatewayErrorCode =
  | 'ROUTE_NOT_FOUND'
  | 'SERVICE_UNAVAILABLE'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INVALID_TOKEN'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'REQUEST_TIMEOUT'
  | 'BAD_REQUEST'
  | 'INTERNAL_ERROR';

// ─── Metrics ───────────────────────────────────────────────────────────────────

export interface RecentRequest {
  timestamp: string;
  requestId: string;
  method: string;
  path: string;
  status: number;
  latencyMs: number;
  service: string;
  instance: string;
}

export interface GatewayMetrics {
  totalRequests: number;
  successfulRequests: number;
  clientErrors: number;
  serverErrors: number;
  rateLimitedRequests: number;
  averageLatency: number;
  p50: number;
  p95: number;
  p99: number;
  requestCountByRoute: Record<string, number>;
  requestCountByBackend: Record<string, number>;
  backendFailures: Record<string, number>;
  backendHealth: Record<string, boolean>;
  recentRequests: RecentRequest[];
}

// ─── Express Request Augmentation ─────────────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      user?: AuthUser;
    }
  }
}

export {};
