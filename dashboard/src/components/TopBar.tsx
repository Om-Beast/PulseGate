import { useDashboardContext } from '../contexts/DashboardContext';
import { StatusBadge } from './StatusBadge';
import type { OverallStatus } from '../types';

function fmt(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function TopBar({ title }: { title: string }) {
  const { metrics, systemHealth, lastUpdated, loading, refresh } = useDashboardContext();

  const status: OverallStatus = systemHealth?.status ?? (
    metrics ? 'healthy' : 'unknown'
  );

  const p95 = metrics?.p95 ?? 0;
  const p95Label = p95 > 0 ? `${p95}ms` : '—';

  return (
    <header className="h-12 bg-[#0d0d14] border-b border-[#22222e] flex items-center px-5 gap-4 flex-shrink-0">
      {/* Page title */}
      <h1 className="text-sm font-semibold text-[#f0f0f4] flex-shrink-0">{title}</h1>

      <div className="flex-1" />

      {/* P95 */}
      <div className="hidden sm:flex items-center gap-1.5 text-xs">
        <span className="text-[#55556a]">P95</span>
        <span className="font-mono font-medium text-[#f0f0f4]">{p95Label}</span>
      </div>

      <div className="w-px h-4 bg-[#22222e]" />

      {/* Status */}
      <StatusBadge status={status} size="sm" pulse={status === 'healthy'} />

      <div className="w-px h-4 bg-[#22222e]" />

      {/* Live indicator */}
      <div className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-yellow-400 animate-pulse' : 'bg-green-500 animate-pulse-dot'}`} />
        <span className="text-[10px] text-[#55556a] font-mono hidden md:block">
          {fmt(lastUpdated)}
        </span>
      </div>

      {/* Refresh */}
      <button
        onClick={refresh}
        aria-label="Refresh data"
        className="w-7 h-7 rounded flex items-center justify-center text-[#55556a] hover:text-[#f0f0f4] hover:bg-[#1e1e28] transition-all border border-transparent hover:border-[#22222e]"
      >
        <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </header>
  );
}
