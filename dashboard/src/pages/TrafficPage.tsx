import { useDashboardContext } from '../contexts/DashboardContext';

export function TrafficPage() {
  const { metrics } = useDashboardContext();

  if (!metrics) return null;

  const routes = Object.entries(metrics.requestCountByRoute).sort((a, b) => b[1] - a[1]);
  const backends = Object.entries(metrics.requestCountByBackend).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100 mb-1">Traffic</h1>
        <p className="text-slate-400 text-sm">Detailed traffic analytics</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface-800 rounded-lg border border-subtle overflow-hidden">
          <div className="p-4 border-b border-subtle bg-surface-700/30">
            <h3 className="font-medium text-slate-200">Requests by Route</h3>
          </div>
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-surface-700/50 text-slate-300">
              <tr>
                <th className="px-4 py-3 font-medium">Route Path</th>
                <th className="px-4 py-3 font-medium text-right">Requests</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/50">
              {routes.map(([route, count]) => (
                <tr key={route} className="hover:bg-surface-700/30">
                  <td className="px-4 py-3 font-mono text-slate-300">{route}</td>
                  <td className="px-4 py-3 text-right text-slate-400">{count.toLocaleString()}</td>
                </tr>
              ))}
              {routes.length === 0 && (
                <tr><td colSpan={2} className="px-4 py-4 text-center text-slate-500">No route traffic data</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-surface-800 rounded-lg border border-subtle overflow-hidden">
          <div className="p-4 border-b border-subtle bg-surface-700/30">
            <h3 className="font-medium text-slate-200">Requests by Backend Instance</h3>
          </div>
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-surface-700/50 text-slate-300">
              <tr>
                <th className="px-4 py-3 font-medium">Instance ID</th>
                <th className="px-4 py-3 font-medium text-right">Requests</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/50">
              {backends.map(([id, count]) => (
                <tr key={id} className="hover:bg-surface-700/30">
                  <td className="px-4 py-3 font-mono text-slate-300">{id.substring(0, 16)}...</td>
                  <td className="px-4 py-3 text-right text-slate-400">{count.toLocaleString()}</td>
                </tr>
              ))}
              {backends.length === 0 && (
                <tr><td colSpan={2} className="px-4 py-4 text-center text-slate-500">No backend traffic data</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
