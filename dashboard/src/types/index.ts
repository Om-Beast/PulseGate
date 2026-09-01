export interface ServiceInstance {
  id: string;
  service: string;
  host: string;
  port: number;
  healthy: boolean;
  lastChecked: string;
  failureCount: number;
  recoveryCount: number;
}

export interface TimeSeriesPoint {
  timestamp: number;
  requests: number;
  p50: number;
  p95: number;
  p99: number;
  errors: number;
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
  timeSeries?: TimeSeriesPoint[];
}

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

export interface RouteConfig {
  service: string;
  strip: string;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  healthyInstances: number;
  totalInstances: number;
  gatewayVersion: string;
  nodeVersion: string;
  nodeEnv: string;
  redisHost: string;
  postgresHost: string;
  gatewayTimeout: number;
  healthCheckInterval: number;
  uptime: number;
  memoryUsage: number;
}

export type OverallStatus = 'healthy' | 'degraded' | 'critical' | 'unknown' | 'unhealthy';

