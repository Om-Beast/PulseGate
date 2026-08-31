import type { ServiceInstance } from '../types';
import { StatusBadge } from './StatusBadge';

interface InstanceTableProps {
  instances: ServiceInstance[];
}

export function InstanceTable({ instances }: InstanceTableProps) {
  if (instances.length === 0) {
    return <div className="text-slate-400 p-4 bg-surface-800 rounded-lg text-center border border-subtle">No instances found.</div>;
  }

  const sorted = [...instances].sort((a, b) => {
    if (a.healthy === b.healthy) return a.service.localeCompare(b.service);
    return a.healthy ? -1 : 1;
  });

  return (
    <div className="bg-surface-800 rounded-lg border border-subtle overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-surface-700/50 text-slate-300">
            <tr>
              <th className="px-4 py-3 font-medium">Instance ID</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Service</th>
              <th className="px-4 py-3 font-medium">Address</th>
              <th className="px-4 py-3 font-medium">Failures</th>
              <th className="px-4 py-3 font-medium">Recoveries</th>
              <th className="px-4 py-3 font-medium">Last Checked</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-700/50">
            {sorted.map((inst) => (
              <tr key={inst.id} className="hover:bg-surface-700/30 transition-colors">
                <td className="px-4 py-3 font-mono text-slate-400">{inst.id.substring(0, 8)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={inst.healthy ? 'healthy' : 'unhealthy'} />
                </td>
                <td className="px-4 py-3 text-slate-200 font-medium">{inst.service}</td>
                <td className="px-4 py-3 text-slate-400 font-mono">{inst.host}:{inst.port}</td>
                <td className="px-4 py-3 text-slate-400">{inst.failureCount}</td>
                <td className="px-4 py-3 text-slate-400">{inst.recoveryCount}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">
                  {new Date(inst.lastChecked).toLocaleTimeString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
