import { useDashboardContext } from '../contexts/DashboardContext';
import { KpiCard } from '../components/KpiCard';
import { ServiceHealthCard } from '../components/ServiceHealthCard';
import { InstanceTable } from '../components/InstanceTable';
import { RequestsTable } from '../components/RequestsTable';
import { TrafficChart } from '../components/TrafficChart';
import { LatencyChart } from '../components/LatencyChart';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorState } from '../components/ErrorState';
import { Activity, AlertTriangle, Clock, ServerCrash } from 'lucide-react';
import { useMemo } from 'react';

export function OverviewPage() {
  const { metrics, services, requests, loading, error } = useDashboardContext();

  const servicesMap = useMemo(() => {
    const map = new Map<string, { total: number; healthy: number }>();
    for (const svc of services) {
      const current = map.get(svc.service) || { total: 0, healthy: 0 };
      current.total += 1;
      if (svc.healthy) current.healthy += 1;
      map.set(svc.service, current);
    }
    return map;
  }, [services]);

  // Mock historical data since API only gives current metrics
  // In a real app, you'd fetch this from Prometheus/etc
  const mockChartData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 20 }).map((_, i) => ({
      time: new Date(now.getTime() - (19 - i) * 5000).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      requests: Math.floor(Math.random() * 50) + (metrics?.totalRequests ? metrics.totalRequests / 100 : 0),
      p50: Math.floor(Math.random() * 10) + (metrics?.p50 || 10),
      p95: Math.floor(Math.random() * 30) + (metrics?.p95 || 50),
      p99: Math.floor(Math.random() * 80) + (metrics?.p99 || 100),
    }));
  }, [metrics]);

  if (loading && !metrics) return <LoadingSpinner />;
  if (error && !metrics) return <ErrorState message={error.message} />;
  if (!metrics) return null;

  const totalReq = metrics.totalRequests;
  const errors = metrics.clientErrors + metrics.serverErrors;
  const errorRate = totalReq > 0 ? ((errors / totalReq) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100 mb-1">Overview</h1>
        <p className="text-slate-400 text-sm">System status and gateway metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard 
          title="Total Requests" 
          value={metrics.totalRequests.toLocaleString()} 
          icon={<Activity className="w-5 h-5" />} 
        />
        <KpiCard 
          title="Error Rate" 
          value={errorRate} 
          unit="%" 
          icon={<AlertTriangle className="w-5 h-5 text-warning" />} 
        />
        <KpiCard 
          title="P95 Latency" 
          value={metrics.p95.toFixed(1)} 
          unit="ms" 
          icon={<Clock className="w-5 h-5 text-accent-500" />} 
        />
        <KpiCard 
          title="Rate Limited" 
          value={metrics.rateLimitedRequests.toLocaleString()} 
          icon={<ServerCrash className="w-5 h-5 text-danger" />} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {Array.from(servicesMap.entries()).map(([name, data]) => (
          <ServiceHealthCard 
            key={name}
            serviceName={name}
            healthyInstances={data.healthy}
            totalInstances={data.total}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface-800 p-5 rounded-lg border border-subtle">
          <h3 className="text-slate-200 font-medium mb-4">Traffic (Requests/sec)</h3>
          <TrafficChart data={mockChartData} />
        </div>
        <div className="bg-surface-800 p-5 rounded-lg border border-subtle">
          <h3 className="text-slate-200 font-medium mb-4">Latency Distribution</h3>
          <LatencyChart data={mockChartData} />
        </div>
      </div>

      <div>
        <h3 className="text-slate-200 font-medium mb-4">Recent Requests</h3>
        <RequestsTable requests={requests.slice(0, 10)} />
      </div>

      <div>
        <h3 className="text-slate-200 font-medium mb-4">Backend Instances</h3>
        <InstanceTable instances={services} />
      </div>
    </div>
  );
}
