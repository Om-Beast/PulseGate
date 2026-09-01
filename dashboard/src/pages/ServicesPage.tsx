import { useDashboardContext } from '../contexts/DashboardContext';
import { StatusBadge, HealthDot } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { SkeletonCard } from '../components/LoadingSpinner';
import type { ServiceInstance, OverallStatus } from '../types';

function groupByService(instances: ServiceInstance[]): Record<string, ServiceInstance[]> {
  return instances.reduce<Record<string, ServiceInstance[]>>((acc, inst) => {
    if (!acc[inst.service]) acc[inst.service] = [];
    acc[inst.service].push(inst);
    return acc;
  }, {});
}

function svcLabel(name: string) {
  const map: Record<string, string> = {
    'user-service': 'User Service',
    'order-service': 'Order Service',
    'product-service': 'Product Service',
  };
  return map[name] ?? name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function ServicesPage() {
  const { services, metrics, loading } = useDashboardContext();

  const groups = groupByService(services);

  return (
    <div className="space-y-4 animate-fade-in">
      {loading && services.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : services.length === 0 ? (
        <EmptyState title="No services registered" message="Start the Docker stack to see backend services" />
      ) : (
        Object.entries(groups).map(([svcName, instances]) => {
          const healthy = instances.filter(i => i.healthy).length;
          const status: OverallStatus = healthy === instances.length ? 'healthy' : healthy > 0 ? 'degraded' : 'critical';
          const totalReqs = Object.entries(metrics?.requestCountByBackend ?? {})
            .filter(([k]) => instances.some(i => i.id === k))
            .reduce((s, [, v]) => s + v, 0);
          const failures = Object.entries(metrics?.backendFailures ?? {})
            .filter(([k]) => instances.some(i => i.id === k))
            .reduce((s, [, v]) => s + v, 0);

          return (
            <div key={svcName} className="bg-[#16161e] border border-[#22222e] rounded-lg overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#22222e] bg-[#111118]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#f0f0f4]">{svcLabel(svcName)}</p>
                    <p className="text-[10px] text-[#55556a] font-mono">{svcName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] text-[#55556a] font-mono uppercase tracking-wide">Requests</p>
                    <p className="text-sm font-mono font-medium text-[#f0f0f4]">{totalReqs.toLocaleString()}</p>
                  </div>
                  {failures > 0 && (
                    <div className="text-right hidden sm:block">
                      <p className="text-[10px] text-[#55556a] font-mono uppercase tracking-wide">Failures</p>
                      <p className="text-sm font-mono font-medium text-red-400">{failures}</p>
                    </div>
                  )}
                  <StatusBadge status={status} />
                </div>
              </div>

              {/* Instances */}
              <div className="p-4">
                <p className="text-[10px] text-[#55556a] uppercase tracking-widest font-mono mb-3">
                  {healthy}/{instances.length} healthy instances
                </p>
                <div className="space-y-2">
                  {instances.map(inst => {
                    const instReqs = metrics?.requestCountByBackend?.[inst.id] ?? 0;
                    const instFails = metrics?.backendFailures?.[inst.id] ?? 0;
                    const lastCheck = inst.lastChecked
                      ? new Date(inst.lastChecked).toLocaleTimeString()
                      : '—';

                    return (
                      <div
                        key={inst.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                          inst.healthy
                            ? 'bg-[#111118] border-[#22222e]'
                            : 'bg-red-950/10 border-red-900/30'
                        }`}
                      >
                        <HealthDot healthy={inst.healthy} pulse={inst.healthy} size="md" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-mono font-medium text-[#f0f0f4] truncate">{inst.id}</p>
                          <p className="text-[10px] text-[#55556a] font-mono">
                            {inst.host}:{inst.port} · checked {lastCheck}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-right flex-shrink-0">
                          {instReqs > 0 && (
                            <div>
                              <p className="text-[9px] text-[#55556a] font-mono uppercase">Req</p>
                              <p className="text-xs font-mono text-[#8888a0]">{instReqs}</p>
                            </div>
                          )}
                          {instFails > 0 && (
                            <div>
                              <p className="text-[9px] text-red-500 font-mono uppercase">Fail</p>
                              <p className="text-xs font-mono text-red-400">{instFails}</p>
                            </div>
                          )}
                          {inst.failureCount > 0 && (
                            <div>
                              <p className="text-[9px] text-[#55556a] font-mono uppercase">Consec</p>
                              <p className="text-xs font-mono text-red-400">{inst.failureCount}✗</p>
                            </div>
                          )}
                          <span className={`text-[9px] font-mono font-semibold tracking-widest px-1.5 py-0.5 rounded ${
                            inst.healthy
                              ? 'bg-green-500/10 text-green-400 border border-green-900/30'
                              : 'bg-red-500/10 text-red-400 border border-red-900/30'
                          }`}>
                            {inst.healthy ? 'HEALTHY' : 'UNHEALTHY'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
