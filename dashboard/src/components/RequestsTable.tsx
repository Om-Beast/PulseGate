import type { RecentRequest } from '../types';
import { clsx } from 'clsx';

interface RequestsTableProps {
  requests: RecentRequest[];
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: 'bg-accent-500/10 text-accent-400 border-accent-500/20',
    POST: 'bg-success/10 text-success border-success/20',
    PUT: 'bg-warning/10 text-warning border-warning/20',
    PATCH: 'bg-warning/10 text-warning border-warning/20',
    DELETE: 'bg-danger/10 text-danger border-danger/20',
  };
  return (
    <span className={clsx('px-2 py-0.5 rounded text-xs font-bold border', colors[method.toUpperCase()] || 'bg-slate-500/10 text-slate-400 border-slate-500/20')}>
      {method.toUpperCase()}
    </span>
  );
}

function StatusText({ status }: { status: number }) {
  const color = status >= 500 ? 'text-danger' : status >= 400 ? 'text-warning' : 'text-success';
  return <span className={clsx('font-medium', color)}>{status}</span>;
}

export function RequestsTable({ requests }: RequestsTableProps) {
  if (requests.length === 0) {
    return <div className="text-slate-400 p-4 bg-surface-800 rounded-lg text-center border border-subtle">No recent requests.</div>;
  }

  return (
    <div className="bg-surface-800 rounded-lg border border-subtle overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-surface-700/50 text-slate-300">
            <tr>
              <th className="px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3 font-medium">Method</th>
              <th className="px-4 py-3 font-medium">Path</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Latency</th>
              <th className="px-4 py-3 font-medium">Service</th>
              <th className="px-4 py-3 font-medium">Request ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-700/50">
            {requests.map((req, i) => (
              <tr key={`${req.requestId}-${i}`} className="hover:bg-surface-700/30 transition-colors">
                <td className="px-4 py-3 text-slate-400 text-xs">{new Date(req.timestamp).toLocaleTimeString()}</td>
                <td className="px-4 py-3"><MethodBadge method={req.method} /></td>
                <td className="px-4 py-3 font-mono text-slate-200">{req.path}</td>
                <td className="px-4 py-3"><StatusText status={req.status} /></td>
                <td className="px-4 py-3 text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="w-12">{req.latencyMs.toFixed(1)}ms</span>
                    <div className="w-16 h-1.5 bg-surface-900 rounded-full overflow-hidden">
                      <div className="h-full bg-accent-500" style={{ width: `${Math.min(100, (req.latencyMs / 500) * 100)}%` }} />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-200">{req.service || '-'}</td>
                <td className="px-4 py-3 font-mono text-slate-500 text-xs">{req.requestId.substring(0, 8)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
