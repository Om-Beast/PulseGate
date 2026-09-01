import { useDashboardContext } from '../contexts/DashboardContext';
import { HealthDot } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';

export function FailuresPage() {
  const { services, metrics, requests } = useDashboardContext();

  const unhealthyInstances = services.filter(s => !s.healthy);
  const recentErrors = requests.filter(r => r.status >= 500 || r.status === 429 || r.status === 408);
  const backendFailures = metrics?.backendFailures ?? {};

  const hasIssues = unhealthyInstances.length > 0 || recentErrors.length > 0;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className={`bg-[#16161e] rounded-lg border p-4 ${unhealthyInstances.length > 0 ? 'border-red-900/40' : 'border-[#22222e]'}`}>
          <p className="text-[10px] text-[#55556a] uppercase tracking-widest font-mono mb-2">Unhealthy Instances</p>
          <p className={`text-2xl font-mono font-semibold ${unhealthyInstances.length > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {unhealthyInstances.length}
          </p>
        </div>
        <div className="bg-[#16161e] border border-[#22222e] rounded-lg p-4">
          <p className="text-[10px] text-[#55556a] uppercase tracking-widest font-mono mb-2">Backend Failures</p>
          <p className={`text-2xl font-mono font-semibold ${Object.keys(backendFailures).length > 0 ? 'text-red-400' : 'text-[#f0f0f4]'}`}>
            {Object.values(backendFailures).reduce((s, v) => s + v, 0)}
          </p>
        </div>
        <div className="bg-[#16161e] border border-[#22222e] rounded-lg p-4">
          <p className="text-[10px] text-[#55556a] uppercase tracking-widest font-mono mb-2">5xx Responses</p>
          <p className={`text-2xl font-mono font-semibold ${(metrics?.serverErrors ?? 0) > 0 ? 'text-red-400' : 'text-[#f0f0f4]'}`}>
            {metrics?.serverErrors ?? 0}
          </p>
        </div>
      </div>

      {/* Unhealthy instances */}
      <div className="bg-[#16161e] border border-[#22222e] rounded-lg">
        <div className="px-4 py-3 border-b border-[#22222e]">
          <p className="text-xs font-medium text-[#8888a0] tracking-widest uppercase">Instance Health</p>
        </div>
        {services.length === 0 ? (
          <EmptyState title="No instances" message="Start the Docker stack" />
        ) : (
          <div className="p-4 space-y-2">
            {services.map(inst => {
              const failures = metrics?.backendFailures?.[inst.id] ?? 0;
              return (
                <div
                  key={inst.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    inst.healthy
                      ? 'bg-[#111118] border-[#22222e]'
                      : 'bg-red-950/20 border-red-900/40'
                  }`}
                >
                  <HealthDot healthy={inst.healthy} pulse={!inst.healthy} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-xs font-medium text-[#f0f0f4] truncate">{inst.id}</p>
                      <span className={`text-[9px] font-mono font-semibold tracking-widest px-1.5 py-0.5 rounded ${
                        inst.healthy
                          ? 'bg-green-500/10 text-green-400 border border-green-900/30'
                          : 'bg-red-500/10 text-red-400 border border-red-900/30'
                      }`}>
                        {inst.healthy ? 'HEALTHY' : 'UNHEALTHY'}
                      </span>
                    </div>
                    {!inst.healthy && (
                      <p className="text-[10px] text-red-400/80 mt-0.5">
                        {inst.failureCount} consecutive failure{inst.failureCount !== 1 ? 's' : ''} → removed from rotation
                      </p>
                    )}
                    {inst.healthy && inst.recoveryCount > 0 && (
                      <p className="text-[10px] text-green-400/80 mt-0.5">
                        Recovered · {inst.recoveryCount} consecutive success{inst.recoveryCount !== 1 ? 'es' : ''}
                      </p>
                    )}
                  </div>
                  {failures > 0 && (
                    <div className="text-right">
                      <p className="text-[9px] text-[#55556a] font-mono uppercase">Total Failures</p>
                      <p className="text-sm font-mono text-red-400">{failures}</p>
                    </div>
                  )}
                  <div className="text-right">
                    <p className="text-[9px] text-[#55556a] font-mono uppercase">Checked</p>
                    <p className="text-[10px] font-mono text-[#8888a0]">
                      {inst.lastChecked ? new Date(inst.lastChecked).toLocaleTimeString() : '—'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Health check algorithm */}
      <div className="bg-[#16161e] border border-[#22222e] rounded-lg p-4">
        <p className="text-xs font-medium text-[#8888a0] tracking-widest uppercase mb-4">Health Check Algorithm</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/5 border border-red-900/20">
              <span className="text-red-400 text-xs font-mono mt-0.5">→</span>
              <div>
                <p className="text-xs font-semibold text-red-300">Mark UNHEALTHY</p>
                <p className="text-xs text-[#55556a] mt-0.5">3 consecutive GET /health failures</p>
                <p className="text-xs text-[#55556a]">Instance removed from load balancer rotation</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/5 border border-green-900/20">
              <span className="text-green-400 text-xs font-mono mt-0.5">→</span>
              <div>
                <p className="text-xs font-semibold text-green-300">Mark RECOVERED</p>
                <p className="text-xs text-[#55556a] mt-0.5">2 consecutive successful health checks</p>
                <p className="text-xs text-[#55556a]">Instance re-enters load balancer rotation</p>
              </div>
            </div>
          </div>
          <div className="space-y-2 text-xs text-[#55556a]">
            <div className="flex justify-between py-1.5 border-b border-[#1a1a24]">
              <span>Check interval</span>
              <span className="font-mono text-[#8888a0]">5 seconds</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#1a1a24]">
              <span>Failure threshold</span>
              <span className="font-mono text-red-400">3 consecutive</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#1a1a24]">
              <span>Recovery threshold</span>
              <span className="font-mono text-green-400">2 consecutive</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#1a1a24]">
              <span>Retry policy</span>
              <span className="font-mono text-[#8888a0]">GET/HEAD/OPTIONS only</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span>Timeout on failure</span>
              <span className="font-mono text-[#8888a0]">10s backend timeout</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent error requests */}
      {recentErrors.length > 0 && (
        <div className="bg-[#16161e] border border-[#22222e] rounded-lg">
          <div className="px-4 py-3 border-b border-[#22222e]">
            <p className="text-xs font-medium text-[#8888a0] tracking-widest uppercase">
              Recent Error Events
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1a1a24]">
                  {['STATUS', 'METHOD', 'PATH', 'SERVICE', 'LATENCY', 'TIME'].map(h => (
                    <th key={h} className="px-4 py-2 text-left text-[10px] font-medium text-[#55556a] tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentErrors.slice(0, 20).map(r => (
                  <tr key={r.requestId} className="border-b border-[#1a1a24] hover:bg-[#1a1a24] transition-colors">
                    <td className="px-4 py-2.5">
                      <span className={`font-mono font-semibold ${r.status >= 500 ? 'text-red-400' : r.status === 429 ? 'text-yellow-400' : 'text-orange-400'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5"><span className="font-mono text-[#8888a0]">{r.method}</span></td>
                    <td className="px-4 py-2.5"><span className="font-mono text-[#8888a0] truncate block max-w-[160px]">{r.path}</span></td>
                    <td className="px-4 py-2.5"><span className="text-[#8888a0]">{r.service !== '-' ? r.service : '—'}</span></td>
                    <td className="px-4 py-2.5"><span className="font-mono text-red-400">{r.latencyMs}ms</span></td>
                    <td className="px-4 py-2.5">
                      <span className="text-[#55556a]">{new Date(r.timestamp).toLocaleTimeString()}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!hasIssues && services.length > 0 && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="w-10 h-10 rounded-full bg-green-500/10 border border-green-900/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <p className="text-sm font-medium text-green-400">All systems nominal</p>
          <p className="text-xs text-[#55556a]">No failures detected</p>
        </div>
      )}
    </div>
  );
}
