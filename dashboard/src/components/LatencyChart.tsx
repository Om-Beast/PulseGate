import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import type { TimeSeriesPoint } from '../types';
import { EmptyState } from './EmptyState';

interface Props {
  timeSeries: TimeSeriesPoint[];
  height?: number;
}

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#16161e] border border-[#22222e] rounded-lg p-2.5 shadow-xl">
      <p className="text-[10px] text-[#55556a] font-mono mb-1.5">{fmtTime(label as number)}</p>
      {(payload as Array<{ name: string; value: number; color: string }>).map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-[10px] text-[#8888a0] uppercase font-mono">{p.name}:</span>
          <span className="text-[10px] font-mono text-[#f0f0f4] font-semibold">{p.value}ms</span>
        </div>
      ))}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomLegend({ payload }: any) {
  return (
    <div className="flex items-center gap-4 mt-1">
      {(payload as Array<{ value: string; color: string }>).map((p) => (
        <div key={p.value} className="flex items-center gap-1.5">
          <span className="w-3 h-px block" style={{ background: p.color }} />
          <span className="text-[9px] font-mono uppercase text-[#55556a]">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export function LatencyChart({ timeSeries, height = 140 }: Props) {
  if (timeSeries.length === 0) {
    return (
      <div style={{ height }}>
        <EmptyState title="No latency data" message="Data appears every 5 seconds" />
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={timeSeries} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1a1a24" vertical={false} />
        <XAxis
          dataKey="timestamp"
          tickFormatter={fmtTime}
          tick={{ fontSize: 9, fill: '#55556a', fontFamily: 'monospace' }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 9, fill: '#55556a', fontFamily: 'monospace' }}
          axisLine={false}
          tickLine={false}
          unit="ms"
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend content={<CustomLegend />} />
        <Line type="monotone" dataKey="p50" stroke="#22c55e" strokeWidth={1.5} dot={false} activeDot={{ r: 3 }} />
        <Line type="monotone" dataKey="p95" stroke="#6366f1" strokeWidth={2} dot={false} activeDot={{ r: 4 }} strokeDasharray="0" />
        <Line type="monotone" dataKey="p99" stroke="#ef4444" strokeWidth={1} dot={false} activeDot={{ r: 3 }} strokeDasharray="4 2" />
      </LineChart>
    </ResponsiveContainer>
  );
}
