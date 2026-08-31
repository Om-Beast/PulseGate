import { StatusBadge } from './StatusBadge';

interface ServiceHealthCardProps {
  serviceName: string;
  healthyInstances: number;
  totalInstances: number;
}

export function ServiceHealthCard({ serviceName, healthyInstances, totalInstances }: ServiceHealthCardProps) {
  let status: 'healthy' | 'unhealthy' | 'degraded' | 'unknown' = 'unknown';
  
  if (totalInstances > 0) {
    if (healthyInstances === totalInstances) status = 'healthy';
    else if (healthyInstances === 0) status = 'unhealthy';
    else status = 'degraded';
  }

  return (
    <div className="bg-surface-800 rounded-lg p-5 border border-subtle flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-slate-200 font-medium">{serviceName}</h3>
        <StatusBadge status={status} />
      </div>
      
      <div className="mt-auto">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-slate-400">Instances</span>
          <span className="text-slate-200 font-medium">{healthyInstances} / {totalInstances}</span>
        </div>
        <div className="w-full bg-surface-900 rounded-full h-1.5 overflow-hidden">
          <div 
            className={`h-full ${status === 'healthy' ? 'bg-success' : status === 'degraded' ? 'bg-warning' : 'bg-danger'}`}
            style={{ width: `${totalInstances > 0 ? (healthyInstances / totalInstances) * 100 : 0}%` }}
          />
        </div>
      </div>
    </div>
  );
}
