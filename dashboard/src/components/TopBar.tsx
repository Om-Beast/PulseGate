import { useDashboardContext } from '../contexts/DashboardContext';
import { Activity } from 'lucide-react';

export function TopBar() {
  const { metrics, lastUpdated } = useDashboardContext();

  const isHealthy = metrics !== null; // Simple health check
  const p95 = metrics?.p95 || 0;
  
  return (
    <header className="h-16 bg-surface-800 border-b border-subtle flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-success shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-danger shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} />
          <span className="text-sm font-medium text-slate-300">
            {isHealthy ? 'Operational' : 'Degraded'}
          </span>
        </div>

        <div className="h-4 w-px bg-surface-600" />

        <div className="flex items-center gap-2 text-sm">
          <Activity className="w-4 h-4 text-slate-400" />
          <span className="text-slate-400">API Latency (p95):</span>
          <span className="font-mono text-accent-400">{p95.toFixed(1)}ms</span>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <span className="text-slate-400">
          Updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : '...'}
        </span>
        <span className="px-2 py-1 rounded bg-surface-900 border border-surface-600 text-[10px] font-bold tracking-wider text-slate-300 uppercase">
          PRODUCTION
        </span>
      </div>
    </header>
  );
}
