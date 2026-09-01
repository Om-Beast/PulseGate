import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchServices,
  fetchRoutes,
  fetchMetrics,
  fetchRequests,
  fetchSystemHealth,
  ApiError,
} from '../lib/api';
import type {
  ServiceInstance,
  RouteConfig,
  GatewayMetrics,
  RecentRequest,
  SystemHealth,
} from '../types';

export interface DashboardData {
  services: ServiceInstance[];
  routes: Record<string, RouteConfig>;
  metrics: GatewayMetrics | null;
  requests: RecentRequest[];
  systemHealth: SystemHealth | null;
  loading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
  isAuthError: boolean;
  refresh: () => void;
}

const POLL_INTERVAL = 5000;

export function useDashboardData(): DashboardData {
  const [services, setServices] = useState<ServiceInstance[]>([]);
  const [routes, setRoutes] = useState<Record<string, RouteConfig>>({});
  const [metrics, setMetrics] = useState<GatewayMetrics | null>(null);
  const [requests, setRequests] = useState<RecentRequest[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isAuthError, setIsAuthError] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [svc, rt, met, req, health] = await Promise.all([
        fetchServices().catch((e) => { if (e instanceof ApiError && e.status === 401) throw e; return []; }),
        fetchRoutes().catch(() => ({})),
        fetchMetrics().catch(() => null),
        fetchRequests().catch(() => []),
        fetchSystemHealth().catch(() => null),
      ]);

      setServices(svc as ServiceInstance[]);
      setRoutes(rt as Record<string, RouteConfig>);
      setMetrics(met);
      setRequests(req as RecentRequest[]);
      setSystemHealth(health);
      setError(null);
      setIsAuthError(false);
      setLastUpdated(new Date());
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setIsAuthError(true);
        setError(err);
      } else {
        setError(err instanceof Error ? err : new Error('Failed to load data'));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    void loadData();

    intervalRef.current = setInterval(() => {
      // Pause polling when tab is hidden
      if (!document.hidden) {
        void loadData();
      }
    }, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadData]);

  return {
    services,
    routes,
    metrics,
    requests,
    systemHealth,
    loading,
    error,
    lastUpdated,
    isAuthError,
    refresh,
  };
}
