import { MetricsCollector } from '../../src/metrics/metricsCollector';

describe('MetricsCollector', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector();
  });

  it('starts with zero counts', () => {
    const m = collector.getMetrics();
    expect(m.totalRequests).toBe(0);
    expect(m.successfulRequests).toBe(0);
    expect(m.clientErrors).toBe(0);
    expect(m.serverErrors).toBe(0);
    expect(m.rateLimitedRequests).toBe(0);
  });

  it('counts successful requests', () => {
    collector.recordRequest({
      requestId: 'r1', method: 'GET', path: '/api/users',
      status: 200, latencyMs: 50, service: 'user-service', instance: 'u-1',
    });
    const m = collector.getMetrics();
    expect(m.totalRequests).toBe(1);
    expect(m.successfulRequests).toBe(1);
    expect(m.clientErrors).toBe(0);
  });

  it('counts 4xx as client errors', () => {
    collector.recordRequest({
      requestId: 'r1', method: 'GET', path: '/api/users',
      status: 404, latencyMs: 20, service: '-', instance: '-',
    });
    const m = collector.getMetrics();
    expect(m.clientErrors).toBe(1);
    expect(m.successfulRequests).toBe(0);
  });

  it('counts 429 as both client error and rate limited', () => {
    collector.recordRequest({
      requestId: 'r1', method: 'GET', path: '/api/users',
      status: 429, latencyMs: 5, service: '-', instance: '-',
    });
    const m = collector.getMetrics();
    expect(m.rateLimitedRequests).toBe(1);
    expect(m.clientErrors).toBe(1);
  });

  it('counts 5xx as server errors', () => {
    collector.recordRequest({
      requestId: 'r1', method: 'GET', path: '/api/users',
      status: 503, latencyMs: 100, service: '-', instance: '-',
    });
    const m = collector.getMetrics();
    expect(m.serverErrors).toBe(1);
  });

  it('tracks requests per route', () => {
    collector.recordRequest({
      requestId: 'r1', method: 'GET', path: '/api/users',
      status: 200, latencyMs: 30, service: 'user-service', instance: 'u-1',
    });
    collector.recordRequest({
      requestId: 'r2', method: 'GET', path: '/api/users',
      status: 200, latencyMs: 25, service: 'user-service', instance: 'u-2',
    });
    const m = collector.getMetrics();
    expect(m.requestCountByRoute['/api/users']).toBe(2);
  });

  it('tracks requests per backend', () => {
    collector.recordRequest({
      requestId: 'r1', method: 'GET', path: '/api/users',
      status: 200, latencyMs: 30, service: 'user-service', instance: 'user-service-1',
    });
    const m = collector.getMetrics();
    expect(m.requestCountByBackend['user-service-1']).toBe(1);
  });

  it('computes latency percentiles', () => {
    const latencies = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    for (const lat of latencies) {
      collector.recordRequest({
        requestId: 'r', method: 'GET', path: '/api/users',
        status: 200, latencyMs: lat, service: 'svc', instance: 'i-1',
      });
    }
    const m = collector.getMetrics();
    expect(m.p50).toBeGreaterThan(0);
    expect(m.p95).toBeGreaterThanOrEqual(m.p50);
    expect(m.p99).toBeGreaterThanOrEqual(m.p95);
  });

  it('returns recent requests newest first', () => {
    collector.recordRequest({
      requestId: 'first', method: 'GET', path: '/api/users',
      status: 200, latencyMs: 10, service: 'svc', instance: 'i',
    });
    collector.recordRequest({
      requestId: 'second', method: 'POST', path: '/api/orders',
      status: 201, latencyMs: 20, service: 'svc', instance: 'i',
    });
    const recent = collector.getRecentRequests();
    expect(recent[0].requestId).toBe('second');
    expect(recent[1].requestId).toBe('first');
  });
});
