import { useState } from 'react';
import { useDashboardContext } from '../contexts/DashboardContext';
import { EmptyState } from '../components/EmptyState';
import { SkeletonRow } from '../components/LoadingSpinner';

type Filter = 'all' | '2xx' | '4xx' | '5xx' | '429';

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
    PUT: 'text-yellow-400', PATCH: 'text-orange-400', DELETE: 'text-red-400',
  };
  return m[method] ?? 'text-[#8888a0]';
}

function relTime(ts: string): string {
  const delta = Date.now() - new Date(ts).getTime();
  if (delta < 1000) return 'just now';
  if (delta < 60000) return `${Math.floor(delta / 1000)}s ago`;
  return `${Math.floor(delta / 60000)}m ago`;
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: '2xx', label: '2xx' },
  { key: '4xx', label: '4xx' },
  { key: '5xx', label: '5xx' },
  { key: '429', label: '429' },
];

export function RequestsPage() {
  const { requests, loading } = useDashboardContext();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = requests.filter(r => {
    const matchFilter =
      filter === 'all' ? true :
      filter === '2xx' ? r.status >= 200 && r.status < 300 :
      filter === '4xx' ? r.status >= 400 && r.status < 500 :
      filter === '5xx' ? r.status >= 500 :
      filter === '429' ? r.status === 429 : true;

    const matchSearch =
      !search ||
      r.path.toLowerCase().includes(search.toLowerCase()) ||
      r.requestId.toLowerCase().includes(search.toLowerCase()) ||
      r.instance.toLowerCase().includes(search.toLowerCase());

    return matchFilter && matchSearch;
  });

  const selectedReq = selected ? requests.find(r => r.requestId === selected) : null;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-[#22222e] overflow-hidden">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f.key
                  ? 'bg-indigo-500/20 text-indigo-300 border-r border-indigo-500/20 last:border-r-0'
                  : 'text-[#55556a] hover:text-[#8888a0] border-r border-[#22222e] last:border-r-0'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search path, request ID, instance…"
          className="flex-1 min-w-48 bg-[#111118] border border-[#22222e] rounded-lg px-3 py-1.5 text-xs text-[#f0f0f4] placeholder-[#55556a] focus:outline-none focus:border-indigo-500 transition-all font-mono"
        />

        <span className="text-[10px] text-[#55556a] font-mono">{filtered.length} results</span>
      </div>

      {/* Table */}
      <div className="bg-[#16161e] border border-[#22222e] rounded-lg overflow-hidden">
        {loading && requests.length === 0 ? (
          <div className="px-4 py-2">
            {Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState title="No requests match" message="Try adjusting the filter or search" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#22222e]">
                  {['STATUS', 'METHOD', 'PATH', 'SERVICE', 'INSTANCE', 'LATENCY', 'TIME'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-medium text-[#55556a] tracking-widest whitespace-nowrap bg-[#111118]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 100).map(r => (
                  <tr
                    key={r.requestId}
                    onClick={() => setSelected(selected === r.requestId ? null : r.requestId)}
                    className={`border-b border-[#1a1a24] cursor-pointer transition-colors ${
                      selected === r.requestId ? 'bg-indigo-500/5' : 'hover:bg-[#1a1a24]'
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      <span className={`font-mono font-semibold ${statusCodeColor(r.status)}`}>{r.status}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`font-mono font-medium text-[11px] ${methodColor(r.method)}`}>{r.method}</span>
                    </td>
                    <td className="px-4 py-2.5 max-w-[200px]">
                      <span className="font-mono text-[#8888a0] truncate block">{r.path}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-[#8888a0]">{r.service !== '-' ? r.service : '—'}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-[#55556a] text-[10px]">{r.instance !== '-' ? r.instance : '—'}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`font-mono ${r.latencyMs > 500 ? 'text-red-400' : r.latencyMs > 100 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {r.latencyMs}ms
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-[#55556a] whitespace-nowrap">{relTime(r.timestamp)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selectedReq && (
        <div className="bg-[#111118] border border-indigo-500/20 rounded-lg p-4 animate-slide-in">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-[#f0f0f4]">Request Detail</p>
            <button
              onClick={() => setSelected(null)}
              className="text-[#55556a] hover:text-[#f0f0f4] transition-colors"
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Request ID', value: selectedReq.requestId, mono: true },
              { label: 'Timestamp', value: new Date(selectedReq.timestamp).toLocaleTimeString() },
              { label: 'Method', value: selectedReq.method, mono: true },
              { label: 'Path', value: selectedReq.path, mono: true },
              { label: 'Status', value: String(selectedReq.status), mono: true },
              { label: 'Latency', value: `${selectedReq.latencyMs}ms`, mono: true },
              { label: 'Service', value: selectedReq.service !== '-' ? selectedReq.service : '—' },
              { label: 'Instance', value: selectedReq.instance !== '-' ? selectedReq.instance : '—', mono: true },
            ].map(({ label, value, mono }) => (
              <div key={label}>
                <p className="text-[10px] text-[#55556a] uppercase tracking-widest font-mono mb-1">{label}</p>
                <p className={`text-xs text-[#f0f0f4] break-all ${mono ? 'font-mono' : ''}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
