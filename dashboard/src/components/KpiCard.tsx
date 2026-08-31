import { ReactNode } from 'react';

interface KpiCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: ReactNode;
  trend?: string;
}

export function KpiCard({ title, value, unit, icon, trend }: KpiCardProps) {
  return (
    <div className="bg-surface-800 rounded-lg p-5 border border-subtle flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <span className="text-slate-400 text-sm font-medium">{title}</span>
        <div className="text-slate-500">{icon}</div>
      </div>
      <div className="flex items-baseline gap-2 mt-auto">
        <span className="text-2xl font-semibold text-slate-100">{value}</span>
        {unit && <span className="text-slate-400 text-sm font-medium">{unit}</span>}
      </div>
      {trend && (
        <div className="mt-2 text-xs font-medium text-slate-400">
          {trend}
        </div>
      )}
    </div>
  );
}
