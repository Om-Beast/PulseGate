import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
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
          <span className="text-[10px] text-[#8888a0] capitalize">{p.name}:</span>
          <span className="text-[10px] font-mono text-[#f0f0f4] font-medium">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export function TrafficChart({ timeSeries, height = 140 }: Props) {
  if (timeSeries.length === 0) {
    return (
      <div style={{ height }}>
        <EmptyState title="No traffic data" message="Data appears every 5 seconds" />
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={timeSeries} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <defs>
          <linearGradient id="trafficGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="errorGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
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
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="requests"
          stroke="#6366f1"
          strokeWidth={1.5}
          fill="url(#trafficGrad)"
          dot={false}
          activeDot={{ r: 3, fill: '#6366f1' }}
        />
        <Area
          type="monotone"
          dataKey="errors"
          stroke="#ef4444"
          strokeWidth={1}
          fill="url(#errorGrad)"
          dot={false}
          activeDot={{ r: 3, fill: '#ef4444' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
