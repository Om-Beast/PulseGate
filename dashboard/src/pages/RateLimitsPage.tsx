import { useDashboardContext } from '../contexts/DashboardContext';
import { KpiCard } from '../components/KpiCard';
import { ShieldAlert, Shield } from 'lucide-react';

const POLICIES = [
  { role: 'Anonymous', limit: 30, window: '1m' },
  { role: 'USER', limit: 100, window: '1m' },
  { role: 'PREMIUM', limit: 500, window: '1m' },
  { role: 'ADMIN', limit: 500, window: '1m' },
];

export function RateLimitsPage() {
  const { metrics } = useDashboardContext();
  
  const limited = metrics?.rateLimitedRequests || 0;
  const total = metrics?.totalRequests || 0;
  const percent = total > 0 ? ((limited / total) * 100).toFixed(2) : '0.00';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100 mb-1">Rate Limits</h1>
        <p className="text-slate-400 text-sm">Quota enforcement and policies</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <KpiCard 
          title="Rate Limited Requests" 
          value={limited.toLocaleString()} 
          icon={<ShieldAlert className="w-5 h-5 text-warning" />} 
        />
        <KpiCard 
          title="Rejection Rate" 
          value={percent} 
          unit="%" 
          icon={<Shield className="w-5 h-5 text-accent-500" />} 
        />
      </div>

      <div className="bg-surface-800 rounded-lg border border-subtle overflow-hidden mt-8">
        <div className="p-4 border-b border-subtle bg-surface-700/30">
          <h3 className="font-medium text-slate-200">Active Policies</h3>
        </div>
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-surface-700/50 text-slate-300">
            <tr>
              <th className="px-4 py-3 font-medium">Role / Identifier</th>
              <th className="px-4 py-3 font-medium">Limit (Requests)</th>
              <th className="px-4 py-3 font-medium">Window</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-700/50">
            {POLICIES.map((p) => (
              <tr key={p.role} className="hover:bg-surface-700/30">
                <td className="px-4 py-3 font-medium text-slate-200">{p.role}</td>
                <td className="px-4 py-3 text-slate-400">{p.limit}</td>
                <td className="px-4 py-3 text-slate-400">{p.window}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
