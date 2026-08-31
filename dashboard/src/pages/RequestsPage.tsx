import { useDashboardContext } from '../contexts/DashboardContext';
import { RequestsTable } from '../components/RequestsTable';
import { useState } from 'react';

export function RequestsPage() {
  const { requests } = useDashboardContext();
  const [filter, setFilter] = useState('');

  const filtered = requests.filter(r => 
    r.path.toLowerCase().includes(filter.toLowerCase()) || 
    r.requestId.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="shrink-0">
        <h1 className="text-2xl font-semibold text-slate-100 mb-1">Requests Log</h1>
        <p className="text-slate-400 text-sm">Real-time HTTP request trace</p>
      </div>

      <div className="flex gap-4 shrink-0">
        <input 
          type="text"
          placeholder="Filter by path or request ID..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-surface-800 border border-subtle rounded-md px-4 py-2 text-sm text-slate-200 placeholder-slate-500 w-full max-w-md focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500"
        />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <RequestsTable requests={filtered} />
      </div>
    </div>
  );
}
