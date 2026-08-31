import { useDashboardContext } from '../contexts/DashboardContext';
import { InstanceTable } from '../components/InstanceTable';
import { StatusBadge } from '../components/StatusBadge';
import { useMemo } from 'react';

export function ServicesPage() {
  const { services, metrics } = useDashboardContext();

  const servicesMap = useMemo(() => {
    const map = new Map<string, typeof services>();
    for (const svc of services) {
      if (!map.has(svc.service)) {
        map.set(svc.service, []);
      }
      map.get(svc.service)!.push(svc);
    }
    return map;
  }, [services]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100 mb-1">Services</h1>
        <p className="text-slate-400 text-sm">Backend service instances and health status</p>
      </div>

      <div className="space-y-8">
        {Array.from(servicesMap.entries()).map(([serviceName, instances]) => {
          const healthy = instances.filter(i => i.healthy).length;
          const total = instances.length;
          const status = healthy === total ? 'healthy' : healthy === 0 ? 'unhealthy' : 'degraded';
          
          return (
            <div key={serviceName} className="bg-surface-800 rounded-lg border border-subtle overflow-hidden">
              <div className="p-5 border-b border-subtle bg-surface-700/30 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-medium text-slate-200">{serviceName}</h2>
                  <StatusBadge status={status} />
                </div>
                <div className="text-sm text-slate-400">
                  <span className="font-medium text-slate-200">{healthy}</span> / {total} instances healthy
                </div>
              </div>
              <div className="p-5">
                <InstanceTable instances={instances} />
              </div>
            </div>
          );
        })}

        {services.length === 0 && (
          <div className="text-slate-400 p-8 text-center bg-surface-800 rounded-lg border border-subtle">
            No services registered.
          </div>
        )}
      </div>
    </div>
  );
}
