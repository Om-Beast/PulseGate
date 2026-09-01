import { useDashboardContext } from '../contexts/DashboardContext';
import { SkeletonCard } from '../components/LoadingSpinner';
import { StatusBadge } from '../components/StatusBadge';

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#1a1a24] last:border-0">
      <span className="text-xs text-[#55556a]">{label}</span>
      <span className={`text-xs ${mono ? 'font-mono' : ''} text-[#f0f0f4]`}>{value}</span>
    </div>
  );
}

function fmtUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SystemPage() {
  const { systemHealth, loading } = useDashboardContext();

  if (loading && !systemHealth) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Gateway status */}
      <div className="bg-[#16161e] border border-[#22222e] rounded-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#22222e]">
          <p className="text-xs font-medium text-[#8888a0] tracking-widest uppercase">Gateway</p>
          {systemHealth && <StatusBadge status={systemHealth.status} pulse />}
        </div>
        <div className="px-4 py-1">
          <Row label="Version" value={systemHealth?.gatewayVersion ?? '1.0.0'} mono />
          <Row label="Environment" value={systemHealth?.nodeEnv ?? 'development'} mono />
          <Row label="Node.js" value={systemHealth?.nodeVersion ?? '—'} mono />
          <Row label="Uptime" value={systemHealth ? fmtUptime(systemHealth.uptime) : '—'} mono />
          <Row label="Memory (heap)" value={systemHealth ? fmtBytes(systemHealth.memoryUsage) : '—'} mono />
          <Row
            label="Instances"
            value={systemHealth ? `${systemHealth.healthyInstances} / ${systemHealth.totalInstances} healthy` : '—'}
            mono
          />
        </div>
      </div>

      {/* Connections */}
      <div className="bg-[#16161e] border border-[#22222e] rounded-lg">
        <div className="px-4 py-3 border-b border-[#22222e]">
          <p className="text-xs font-medium text-[#8888a0] tracking-widest uppercase">Connections</p>
        </div>
        <div className="px-4 py-1">
          <Row label="Redis host" value={systemHealth?.redisHost ?? 'localhost'} mono />
          <Row label="PostgreSQL host" value={systemHealth?.postgresHost ?? 'localhost'} mono />
        </div>
      </div>

      {/* Configuration */}
      <div className="bg-[#16161e] border border-[#22222e] rounded-lg">
        <div className="px-4 py-3 border-b border-[#22222e]">
          <p className="text-xs font-medium text-[#8888a0] tracking-widest uppercase">Configuration</p>
        </div>
        <div className="px-4 py-1">
          <Row label="Backend timeout" value={systemHealth ? `${systemHealth.gatewayTimeout}ms` : '10000ms'} mono />
          <Row label="Health check interval" value={systemHealth ? `${systemHealth.healthCheckInterval}ms` : '5000ms'} mono />
          <Row label="Failure threshold" value="3 consecutive failures" mono />
          <Row label="Recovery threshold" value="2 consecutive successes" mono />
          <Row label="Rate limit window" value="60 seconds" mono />
          <Row label="Max recent requests" value="500" mono />
          <Row label="Retry policy" value="GET / HEAD / OPTIONS only" mono />
          <Row label="Proxy engine" value="Node.js http.request (built-in)" mono />
        </div>
      </div>

      {/* Technology stack */}
      <div className="bg-[#16161e] border border-[#22222e] rounded-lg p-4">
        <p className="text-xs font-medium text-[#8888a0] tracking-widest uppercase mb-4">Technology Stack</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Runtime', value: 'Node.js 20+' },
            { label: 'Framework', value: 'Express 4' },
            { label: 'Language', value: 'TypeScript 5' },
            { label: 'Auth', value: 'JWT + bcrypt' },
            { label: 'Rate Limiting', value: 'Redis token bucket' },
            { label: 'Database', value: 'PostgreSQL 16' },
            { label: 'Cache', value: 'Redis 7' },
            { label: 'Dashboard', value: 'React 18 + Vite' },
          ].map(item => (
            <div key={item.label} className="bg-[#111118] border border-[#22222e] rounded-lg px-3 py-2.5">
              <p className="text-[10px] text-[#55556a] font-mono uppercase tracking-wide mb-1">{item.label}</p>
              <p className="text-xs font-medium text-[#f0f0f4]">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
