import { useDashboardContext } from '../contexts/DashboardContext';

export function SystemPage() {
  const { routes } = useDashboardContext();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100 mb-1">System Configuration</h1>
        <p className="text-slate-400 text-sm">Gateway internals and routing</p>
      </div>

      <div className="bg-surface-800 rounded-lg border border-subtle overflow-hidden">
        <div className="p-4 border-b border-subtle bg-surface-700/30">
          <h3 className="font-medium text-slate-200">Routing Table</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-surface-700/50 text-slate-300">
              <tr>
                <th className="px-4 py-3 font-medium">Prefix (Route)</th>
                <th className="px-4 py-3 font-medium">Target Service</th>
                <th className="px-4 py-3 font-medium">Strip Prefix</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/50">
              {Object.entries(routes).map(([prefix, config]) => (
                <tr key={prefix} className="hover:bg-surface-700/30">
                  <td className="px-4 py-3 font-mono text-slate-200">{prefix}</td>
                  <td className="px-4 py-3 font-medium text-accent-400">{config.service}</td>
                  <td className="px-4 py-3 font-mono text-slate-400">{config.strip}</td>
                </tr>
              ))}
              {Object.keys(routes).length === 0 && (
                <tr><td colSpan={3} className="px-4 py-4 text-center text-slate-500">No routes configured</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-surface-800 rounded-lg border border-subtle p-5">
        <h3 className="font-medium text-slate-200 mb-4">Gateway Information</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-subtle pb-2">
            <span className="text-slate-400">Version</span>
            <span className="text-slate-200 font-mono">1.0.0</span>
          </div>
          <div className="flex justify-between border-b border-subtle pb-2">
            <span className="text-slate-400">Environment</span>
            <span className="text-slate-200 font-mono">production</span>
          </div>
          <div className="flex justify-between border-b border-subtle pb-2">
            <span className="text-slate-400">Node Version</span>
            <span className="text-slate-200 font-mono">v20.x</span>
          </div>
        </div>
      </div>
    </div>
  );
}
