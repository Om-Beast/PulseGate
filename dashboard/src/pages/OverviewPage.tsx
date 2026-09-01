import { useDashboardContext } from '../contexts/DashboardContext';
import { KpiCard } from '../components/KpiCard';
import { StatusBadge, HealthDot } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { SkeletonCard, SkeletonRow } from '../components/LoadingSpinner';
import { TrafficChart } from '../components/TrafficChart';
import { LatencyChart } from '../components/LatencyChart';
import type { OverallStatus, ServiceInstance } from '../types';

function fmt(ms: number) {
  return ms > 0 ? `${ms}ms` : '—';
}

function errorRate(total: number, errors: number): string {
  if (total === 0) return '0.0%';
  return `${((errors / total) * 100).toFixed(1)}%`;
}

// Group instances by service name
function groupByService(instances: ServiceInstance[]): Record<string, ServiceInstance[]> {
  return instances.reduce<Record<string, ServiceInstance[]>>((acc, inst) => {
    const key = inst.service;
    if (!acc[key]) acc[key] = [];
    acc[key].push(inst);
    return acc;
  }, {});
}

function statusCodeColor(status: number) {
  if (status >= 500) return 'text-red-400';
  if (status === 429) return 'text-yellow-400';
  if (status >= 400) return 'text-orange-400';
  if (status >= 200) return 'text-green-400';
  return 'text-[#8888a0]';
}

function methodColor(method: string) {
  const m: Record<string, string> = {
    GET: 'text-blue-400', POST: 'text-green-400',
    PUT: 'text-yellow-400', PATCH: 'text-orange-400',
    DELETE: 'text-red-400',
  };
  return m[method] ?? 'text-[#8888a0]';
}

function relTime(ts: string): string {
  const delta = Date.now() - new Date(ts).getTime();
  if (delta < 1000) return 'just now';
  if (delta < 60000) return `${Math.floor(delta / 1000)}s ago`;
  return `${Math.floor(delta / 60000)}m ago`;
}

export function OverviewPage() {
  const { metrics, services, requests, systemHealth, loading } = useDashboardContext();

  const serviceGroups = groupByService(services);
  const totalInstances = services.length;
  const healthyInstances = services.filter((s) => s.healthy).length;

  const overallStatus: OverallStatus = systemHealth?.status ?? (
    services.length === 0 ? 'unknown' :
    healthyInstances === totalInstances ? 'healthy' :
    healthyInstances > 0 ? 'degraded' : 'critical'
  );

  const totalRequests = metrics?.totalRequests ?? 0;
  const totalErrors = (metrics?.clientErrors ?? 0) + (metrics?.serverErrors ?? 0);
  const rateLimited = metrics?.rateLimitedRequests ?? 0;
  const p95 = metrics?.p95 ?? 0;

  const recentTop = requests.slice(0, 12);

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Hero Status ─────────────────────────────────────────────── */}
      <div className="bg-[#111118] border border-[#22222e] rounded-lg px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-mono tracking-widest text-[#55556a] uppercase mb-1.5">System Status</p>
          <div className="flex items-center gap-3">
            <StatusBadge status={overallStatus} size="lg" pulse />
            <span className="text-[#55556a] text-sm">
              {loading ? '—' : `${healthyInstances} / ${totalInstances} instances healthy`}
            </span>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-6">
          <div className="text-right">
            <p className="text-[10px] text-[#55556a] tracking-wide uppercase font-mono">P95 Latency</p>
            <p className="text-lg font-semibold font-mono text-[#f0f0f4] mt-0.5">{fmt(p95)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-[#55556a] tracking-wide uppercase font-mono">Total Requests</p>
            <p className="text-lg font-semibold font-mono text-[#f0f0f4] mt-0.5">{totalRequests.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-[#55556a] tracking-wide uppercase font-mono">Error Rate</p>
            <p className={`text-lg font-semibold font-mono mt-0.5 ${totalErrors > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {errorRate(totalRequests, totalErrors)}
            </p>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <KpiCard
              label="Total Requests"
              value={totalRequests.toLocaleString()}
              sub="Gateway lifetime"
              accent="default"
              mono
              icon={
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
                </svg>
              }
            />
            <KpiCard
              label="P95 Latency"
              value={fmt(p95)}
              sub={`P50: ${fmt(metrics?.p50 ?? 0)} · P99: ${fmt(metrics?.p99 ?? 0)}`}
              accent={p95 > 500 ? 'red' : p95 > 200 ? 'yellow' : 'green'}
              mono
              icon={
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <KpiCard
              label="Error Rate"
              value={errorRate(totalRequests, totalErrors)}
              sub={`${totalErrors} errors total`}
              accent={totalErrors > 0 ? 'red' : 'green'}
              mono
              icon={
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              }
            />
            <KpiCard
              label="Rate Limited"
              value={rateLimited.toLocaleString()}
              sub="429 responses issued"
              accent={rateLimited > 0 ? 'yellow' : 'default'}
              mono
              icon={
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              }
            />
          </>
        )}
      </div>

      {/* ── Charts ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-[#16161e] border border-[#22222e] rounded-lg p-4">
          <p className="text-xs font-medium text-[#8888a0] tracking-widest uppercase mb-3">Traffic</p>
          <TrafficChart timeSeries={metrics?.timeSeries ?? []} height={140} />
        </div>
        <div className="bg-[#16161e] border border-[#22222e] rounded-lg p-4">
          <p className="text-xs font-medium text-[#8888a0] tracking-widest uppercase mb-3">Latency Percentiles</p>
          <LatencyChart timeSeries={metrics?.timeSeries ?? []} height={140} />
        </div>
      </div>

      {/* ── Service Fleet ───────────────────────────────────────────── */}
      <div className="bg-[#16161e] border border-[#22222e] rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-medium text-[#8888a0] tracking-widest uppercase">Backend Fleet</p>
          <span className="text-[10px] font-mono text-[#55556a]">
            {healthyInstances}/{totalInstances} healthy
          </span>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : services.length === 0 ? (
          <EmptyState title="No instances registered" message="Start the Docker stack to see backend fleet" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.entries(serviceGroups).map(([svcName, instances]) => {
              const healthy = instances.filter((i) => i.healthy).length;
              const svcStatus: OverallStatus = healthy === instances.length ? 'healthy' : healthy > 0 ? 'degraded' : 'critical';
              const svcRequests = Object.entries(metrics?.requestCountByBackend ?? {})
                .filter(([k]) => instances.some(i => i.id === k))
                .reduce((s, [, v]) => s + v, 0);
              return (
                <div key={svcName} className="bg-[#111118] border border-[#22222e] rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2.5">
                    <p className="text-xs font-semibold text-[#f0f0f4] capitalize">
                      {svcName.replace(/-/g, ' ')}
                    </p>
                    <StatusBadge status={svcStatus} size="sm" />
                  </div>
                  <div className="space-y-1.5">
                    {instances.map((inst) => {
                      const instReqs = metrics?.requestCountByBackend?.[inst.id] ?? 0;
                      return (
                        <div key={inst.id} className="flex items-center gap-2 py-1">
                          <HealthDot healthy={inst.healthy} pulse={inst.healthy} />
                          <span className="font-mono text-[10px] text-[#8888a0] flex-1 truncate">{inst.id}</span>
                          {instReqs > 0 && (
                            <span className="font-mono text-[10px] text-[#55556a]">{instReqs} req</span>
                          )}
                          {!inst.healthy && inst.failureCount > 0 && (
                            <span className="text-[9px] font-mono text-red-500">{inst.failureCount}✗</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {svcRequests > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-[#1a1a24]">
                      <span className="text-[10px] text-[#55556a] font-mono">{svcRequests.toLocaleString()} total requests</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Request Flow Diagram ─────────────────────────────────────── */}
      <div className="bg-[#16161e] border border-[#22222e] rounded-lg p-4">
        <p className="text-xs font-medium text-[#8888a0] tracking-widest uppercase mb-4">Request Pipeline</p>
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {[
            { label: 'CLIENT', sub: 'HTTP Request' },
            null,
            { label: 'PULSEGATE', sub: 'Gateway :3000', highlight: true },
            null,
            { label: 'AUTH', sub: 'JWT verify' },
            null,
            { label: 'RATE LIMIT', sub: 'Redis token bucket' },
            null,
            { label: 'ROUTE', sub: 'Prefix match' },
            null,
            { label: 'LOAD BALANCER', sub: 'Round-robin' },
            null,
            { label: 'BACKEND', sub: 'HTTP proxy' },
          ].map((step, i) => {
            if (step === null) {
              return (
                <div key={i} className="flex-shrink-0 flex items-center">
                  <div className="w-6 h-px bg-[#22222e]" />
                  <div className="w-0 h-0 border-t-2 border-b-2 border-l-4 border-t-transparent border-b-transparent border-l-[#22222e]" />
                </div>
              );
            }
            return (
              <div
                key={i}
                className={`flex-shrink-0 text-center px-3 py-2 rounded border ${
                  step.highlight
                    ? 'bg-indigo-500/10 border-indigo-500/30'
                    : 'bg-[#111118] border-[#22222e]'
                }`}
              >
                <p className={`text-[9px] font-mono font-semibold tracking-widest ${step.highlight ? 'text-indigo-400' : 'text-[#f0f0f4]'}`}>
                  {step.label}
                </p>
                <p className="text-[8px] text-[#55556a] mt-0.5 whitespace-nowrap">{step.sub}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Recent Requests ─────────────────────────────────────────── */}
      <div className="bg-[#16161e] border border-[#22222e] rounded-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#22222e]">
          <p className="text-xs font-medium text-[#8888a0] tracking-widest uppercase">Recent Requests</p>
          <a href="/requests" className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors">View all →</a>
        </div>

        {loading ? (
          <div className="px-4 py-2">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : recentTop.length === 0 ? (
          <EmptyState title="No requests captured yet" message="Send traffic through the gateway to see requests here" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1a1a24]">
                  {['STATUS', 'METHOD', 'PATH', 'SERVICE', 'INSTANCE', 'LATENCY', 'TIME'].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-[10px] font-medium text-[#55556a] tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentTop.map((r) => (
                  <tr key={r.requestId} className="border-b border-[#1a1a24] hover:bg-[#1a1a24] transition-colors">
                    <td className="px-4 py-2">
                      <span className={`font-mono font-semibold ${statusCodeColor(r.status)}`}>{r.status}</span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`font-mono font-medium ${methodColor(r.method)}`}>{r.method}</span>
                    </td>
                    <td className="px-4 py-2">
                      <span className="font-mono text-[#8888a0] truncate max-w-[180px] block">{r.path}</span>
                    </td>
                    <td className="px-4 py-2">
                      <span className="text-[#8888a0]">{r.service !== '-' ? r.service : '—'}</span>
                    </td>
                    <td className="px-4 py-2">
                      <span className="font-mono text-[#55556a] text-[10px]">{r.instance !== '-' ? r.instance : '—'}</span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`font-mono ${r.latencyMs > 500 ? 'text-red-400' : r.latencyMs > 100 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {r.latencyMs}ms
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className="text-[#55556a] whitespace-nowrap">{relTime(r.timestamp)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
