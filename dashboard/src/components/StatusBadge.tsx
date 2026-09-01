import type { OverallStatus } from '../types';

interface Props {
  status: OverallStatus;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const config: Record<OverallStatus | string, { dot: string; text: string; label: string }> = {
  healthy:  { dot: 'bg-green-500',  text: 'text-green-400',  label: 'HEALTHY'  },
  degraded: { dot: 'bg-yellow-500', text: 'text-yellow-400', label: 'DEGRADED' },
  critical: { dot: 'bg-red-500',    text: 'text-red-400',    label: 'CRITICAL' },
  unknown:  { dot: 'bg-gray-500',   text: 'text-gray-400',   label: 'UNKNOWN'  },
};

const sizes = {
  sm: { dot: 'w-1.5 h-1.5', text: 'text-xs' },
  md: { dot: 'w-2 h-2',     text: 'text-xs' },
  lg: { dot: 'w-2.5 h-2.5', text: 'text-sm' },
};

export function StatusBadge({ status, size = 'md', pulse = false }: Props) {
  const c = config[status];
  const s = sizes[size];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`rounded-full flex-shrink-0 ${c.dot} ${s.dot} ${pulse ? 'animate-pulse-dot' : ''}`}
      />
      <span className={`font-mono font-medium tracking-widest ${c.text} ${s.text}`}>
        {c.label}
      </span>
    </span>
  );
}

interface HealthDotProps {
  healthy: boolean;
  pulse?: boolean;
  size?: 'sm' | 'md';
}
export function HealthDot({ healthy, pulse, size = 'sm' }: HealthDotProps) {
  const sz = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';
  return (
    <span
      className={`rounded-full inline-block flex-shrink-0 ${sz} ${healthy ? 'bg-green-500' : 'bg-red-500'} ${pulse ? 'animate-pulse-dot' : ''}`}
      aria-label={healthy ? 'healthy' : 'unhealthy'}
    />
  );
}

