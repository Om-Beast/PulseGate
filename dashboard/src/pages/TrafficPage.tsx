import { useDashboardContext } from '../contexts/DashboardContext';
import { TrafficChart } from '../components/TrafficChart';
import { LatencyChart } from '../components/LatencyChart';
import { KpiCard } from '../components/KpiCard';

export function TrafficPage() {
  const { metrics } = useDashboardContext();

  const ts = metrics?.timeSeries ?? [];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="P50 Latency" value={metrics?.p50 ? `${metrics.p50}ms` : '—'} accent="green" mono />
        <KpiCard label="P95 Latency" value={metrics?.p95 ? `${metrics.p95}ms` : '—'} accent={metrics?.p95 && metrics.p95 > 200 ? 'yellow' : 'green'} mono />
        <KpiCard label="P99 Latency" value={metrics?.p99 ? `${metrics.p99}ms` : '—'} accent={metrics?.p99 && metrics.p99 > 500 ? 'red' : 'default'} mono />
      </div>

      <div className="bg-[#16161e] border border-[#22222e] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-[#8888a0] tracking-widest uppercase">Request Volume</p>
          <span className="text-[10px] text-[#55556a] font-mono">5-minute rolling window</span>
        </div>
        <TrafficChart timeSeries={ts} height={220} />
      </div>

      <div className="bg-[#16161e] border border-[#22222e] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-[#8888a0] tracking-widest uppercase">Latency Percentiles</p>
          <div className="flex items-center gap-3 text-[10px] font-mono">
            <span className="flex items-center gap-1"><span className="w-2 h-px bg-green-500 inline-block"/>P50</span>
            <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-indigo-500 inline-block"/>P95</span>
            <span className="flex items-center gap-1"><span className="w-2 h-px bg-red-500 inline-block"/>P99</span>
          </div>
        </div>
        <LatencyChart timeSeries={ts} height={220} />
      </div>

      {/* Per-route table */}
      {metrics?.requestCountByRoute && Object.keys(metrics.requestCountByRoute).length > 0 && (
        <div className="bg-[#16161e] border border-[#22222e] rounded-lg">
          <div className="px-4 py-3 border-b border-[#22222e]">
            <p className="text-xs font-medium text-[#8888a0] tracking-widest uppercase">Requests by Route</p>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#1a1a24]">
                <th className="px-4 py-2 text-left text-[10px] font-medium text-[#55556a] tracking-widest">ROUTE</th>
                <th className="px-4 py-2 text-right text-[10px] font-medium text-[#55556a] tracking-widest">REQUESTS</th>
                <th className="px-4 py-2 text-right text-[10px] font-medium text-[#55556a] tracking-widest">SHARE</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(metrics.requestCountByRoute)
                .sort(([, a], [, b]) => b - a)
                .map(([route, count]) => {
                  const share = metrics.totalRequests > 0
                    ? ((count / metrics.totalRequests) * 100).toFixed(1)
                    : '0.0';
                  return (
                    <tr key={route} className="border-b border-[#1a1a24] hover:bg-[#1a1a24] transition-colors">
                      <td className="px-4 py-2.5 font-mono text-[#8888a0]">{route}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-[#f0f0f4]">{count.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-[#55556a]">{share}%</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
