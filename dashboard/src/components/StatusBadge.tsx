import { clsx } from 'clsx';

interface StatusBadgeProps {
  status: 'healthy' | 'unhealthy' | 'degraded' | 'unknown';
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const styles = {
    healthy: 'bg-success/10 text-success border-success/20',
    unhealthy: 'bg-danger/10 text-danger border-danger/20',
    degraded: 'bg-warning/10 text-warning border-warning/20',
    unknown: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  };

  const dots = {
    healthy: 'bg-success',
    unhealthy: 'bg-danger',
    degraded: 'bg-warning',
    unknown: 'bg-slate-400',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border',
        styles[status]
      )}
    >
      <span className={clsx('w-1.5 h-1.5 rounded-full', dots[status])} />
      {status.toUpperCase()}
    </span>
  );
}
