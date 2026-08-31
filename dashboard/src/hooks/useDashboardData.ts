import { useState, useEffect, useCallback } from 'react';
import { fetchServices, fetchRoutes, fetchMetrics, fetchRequests } from '../lib/api';
import type { ServiceInstance, RouteConfig, GatewayMetrics, RecentRequest } from '../types';

export interface DashboardData {
  services: ServiceInstance[];
  routes: Record<string, RouteConfig>;
  metrics: GatewayMetrics | null;
  requests: RecentRequest[];
  loading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
}

export function useDashboardData(): DashboardData {
  const [data, setData] = useState<Omit<DashboardData, 'loading' | 'error' | 'lastUpdated'>>({
    services: [],
    routes: {},
    metrics: null,
    requests: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [services, routes, metrics, requests] = await Promise.all([
        fetchServices().catch(() => []),
        fetchRoutes().catch(() => ({})),
        fetchMetrics().catch(() => null),
        fetchRequests().catch(() => []),
      ]);

      setData({
        services,
        routes,
        metrics,
        requests,
      });
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error fetching data'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  return {
    ...data,
    loading,
    error,
    lastUpdated,
  };
}
