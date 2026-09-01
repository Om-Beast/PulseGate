import type { ReactNode } from 'react';

interface Props {
  label: string;
  value: string | number;
  sub?: string;
  icon?: ReactNode;
  accent?: 'default' | 'green' | 'yellow' | 'red' | 'blue';
  mono?: boolean;
}

const accents = {
  default: { border: 'border-[#22222e]',   iconBg: 'bg-[#6366f120]', iconText: 'text-indigo-400' },
  green:   { border: 'border-green-900/40', iconBg: 'bg-green-500/10', iconText: 'text-green-400'  },
  yellow:  { border: 'border-yellow-900/40',iconBg: 'bg-yellow-500/10',iconText: 'text-yellow-400' },
  red:     { border: 'border-red-900/40',   iconBg: 'bg-red-500/10',   iconText: 'text-red-400'    },
  blue:    { border: 'border-blue-900/40',  iconBg: 'bg-blue-500/10',  iconText: 'text-blue-400'   },
};

export function KpiCard({ label, value, sub, icon, accent = 'default', mono }: Props) {
  const a = accents[accent];
  return (
    <div
      className={`bg-[#16161e] border ${a.border} rounded-lg p-4 flex flex-col gap-3 animate-fade-in`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[#8888a0] tracking-widest uppercase">{label}</span>
        {icon && (
          <span className={`w-7 h-7 rounded flex items-center justify-center ${a.iconBg} ${a.iconText}`}>
            {icon}
          </span>
        )}
      </div>
      <div className="flex items-end gap-2">
        <span
          className={`text-2xl font-semibold text-[#f0f0f4] leading-none ${mono ? 'font-mono' : ''}`}
        >
          {value}
        </span>
      </div>
      {sub && <p className="text-xs text-[#55556a] leading-tight">{sub}</p>}
    </div>
  );
}
