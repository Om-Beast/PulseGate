import { GatewayMetrics, RecentRequest } from '../types';
import { config } from '../config/settings';

export interface TimeSeriesPoint {
  timestamp: number;
  requests: number;
  p50: number;
  p95: number;
  p99: number;
  errors: number;
}

/**
 * MetricsCollector gathers real-time gateway metrics.
 *
 * Design decisions:
 * - All state is in-memory for simplicity (sufficient for a single gateway instance)
 * - Latencies array is bounded to prevent unbounded memory growth
 * - RecentRequests uses a fixed-size ring-buffer style (splice when full)
 * - Percentile calculation is done on-demand (p50, p95, p99)
 * - timeSeries stores up to 60 snapshots (5-minute rolling window at 5s intervals)
 */
export class MetricsCollector {
  private totalRequests = 0;
  private successfulRequests = 0;
  private clientErrors = 0;
  private serverErrors = 0;
  private rateLimitedRequests = 0;

  private requestCountByRoute: Record<string, number> = {};
  private requestCountByBackend: Record<string, number> = {};
  private backendFailures: Record<string, number> = {};

  // Bounded array for latency percentile computation
  private latencies: number[] = [];
  private readonly MAX_LATENCIES = 10000;

  // Ring-buffer for recent requests
  private recentRequests: RecentRequest[] = [];
  private readonly MAX_RECENT_REQUESTS: number;

  // Rolling 5-minute time-series (one point per 5s = 60 points max)
  private timeSeries: TimeSeriesPoint[] = [];
  private readonly MAX_TIME_SERIES = 60;
  private lastSnapshotTotal = 0;
  private lastSnapshotErrors = 0;

  constructor() {
    this.MAX_RECENT_REQUESTS = config.gateway.maxRecentRequests;
  }

  recordRequest(data: {
    requestId: string;
    method: string;
    path: string;
    status: number;
    latencyMs: number;
    service: string;
    instance: string;
  }): void {
    this.totalRequests++;

    if (data.status >= 500) {
      this.serverErrors++;
    } else if (data.status === 429) {
      this.rateLimitedRequests++;
      this.clientErrors++;
    } else if (data.status >= 400) {
      this.clientErrors++;
    } else if (data.status >= 200 && data.status < 400) {
      this.successfulRequests++;
    }

    // Track per-route
    if (data.path) {
      const routeKey = this.normalizeRoute(data.path);
      this.requestCountByRoute[routeKey] = (this.requestCountByRoute[routeKey] ?? 0) + 1;
    }

    // Track per-backend instance
    if (data.instance) {
      this.requestCountByBackend[data.instance] =
        (this.requestCountByBackend[data.instance] ?? 0) + 1;
    }

    // Track latency (bounded)
    this.latencies.push(data.latencyMs);
    if (this.latencies.length > this.MAX_LATENCIES) {
      this.latencies.splice(0, this.latencies.length - this.MAX_LATENCIES);
    }

    // Add to recent requests (bounded ring buffer)
    const recentRequest: RecentRequest = {
      timestamp: new Date().toISOString(),
      requestId: data.requestId,
      method: data.method,
      path: data.path,
      status: data.status,
      latencyMs: data.latencyMs,
      service: data.service,
      instance: data.instance,
    };

    this.recentRequests.push(recentRequest);
    if (this.recentRequests.length > this.MAX_RECENT_REQUESTS) {
      this.recentRequests.splice(0, this.recentRequests.length - this.MAX_RECENT_REQUESTS);
    }
  }

  recordBackendFailure(instanceId: string): void {
    this.backendFailures[instanceId] = (this.backendFailures[instanceId] ?? 0) + 1;
  }

  /**
   * Called every 5 seconds to snapshot a time-series data point.
   * Invoked from server.ts setInterval.
   */
  snapshotTimeSeries(): void {
    const totalErrors = this.clientErrors + this.serverErrors;
    const intervalRequests = this.totalRequests - this.lastSnapshotTotal;
    const intervalErrors = totalErrors - this.lastSnapshotErrors;

    // Compute percentiles from last 500 latency samples (recent window)
    const recentLats = this.latencies.slice(-500);
    const sorted = [...recentLats].sort((a, b) => a - b);

    const point: TimeSeriesPoint = {
      timestamp: Date.now(),
      requests: Math.max(0, intervalRequests),
      p50: this.calcPercentile(sorted, 50),
      p95: this.calcPercentile(sorted, 95),
      p99: this.calcPercentile(sorted, 99),
      errors: Math.max(0, intervalErrors),
    };

    this.timeSeries.push(point);
    if (this.timeSeries.length > this.MAX_TIME_SERIES) {
      this.timeSeries.splice(0, this.timeSeries.length - this.MAX_TIME_SERIES);
    }

    this.lastSnapshotTotal = this.totalRequests;
    this.lastSnapshotErrors = totalErrors;
  }

  getTimeSeries(): TimeSeriesPoint[] {
    return [...this.timeSeries];
  }

  getMetrics(): GatewayMetrics {
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const avg =
      sorted.length > 0
        ? Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length)
        : 0;

    return {
      totalRequests: this.totalRequests,
      successfulRequests: this.successfulRequests,
      clientErrors: this.clientErrors,
      serverErrors: this.serverErrors,
      rateLimitedRequests: this.rateLimitedRequests,
      averageLatency: avg,
      p50: this.calcPercentile(sorted, 50),
      p95: this.calcPercentile(sorted, 95),
      p99: this.calcPercentile(sorted, 99),
      requestCountByRoute: { ...this.requestCountByRoute },
      requestCountByBackend: { ...this.requestCountByBackend },
      backendFailures: { ...this.backendFailures },
      backendHealth: {},
      recentRequests: this.getRecentRequests(),
      timeSeries: this.getTimeSeries(),
    };
  }

  getRecentRequests(): RecentRequest[] {
    // Return newest first
    return [...this.recentRequests].reverse();
  }

  private calcPercentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.min(index, sorted.length - 1)];
  }

  private normalizeRoute(path: string): string {
    // Normalize paths like /api/users/123 to /api/users/:id
    return path
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
      .replace(/\/\d+/g, '/:id');
  }
}

// Singleton
export const metrics = new MetricsCollector();
