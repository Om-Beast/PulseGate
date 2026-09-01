import { useDashboardContext } from '../contexts/DashboardContext';

const RATE_POLICIES = [
  { role: 'ANONYMOUS', limit: 30, window: '1 minute', color: 'text-[#8888a0]', bg: 'bg-[#111118] border-[#22222e]' },
  { role: 'USER', limit: 100, window: '1 minute', color: 'text-blue-400', bg: 'bg-blue-500/5 border-blue-900/30' },
  { role: 'PREMIUM', limit: 500, window: '1 minute', color: 'text-indigo-400', bg: 'bg-indigo-500/5 border-indigo-900/30' },
  { role: 'ADMIN', limit: 'Unlimited', window: '—', color: 'text-green-400', bg: 'bg-green-500/5 border-green-900/30' },
];

export function RateLimitsPage() {
  const { metrics } = useDashboardContext();
  const rateLimited = metrics?.rateLimitedRequests ?? 0;
  const total = metrics?.totalRequests ?? 0;
  const rlRate = total > 0 ? ((rateLimited / total) * 100).toFixed(2) : '0.00';

  const recentRateLimited = (metrics ? [] : []);

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#16161e] border border-[#22222e] rounded-lg p-4">
          <p className="text-[10px] text-[#55556a] uppercase tracking-widest font-mono mb-2">Rate Limited</p>
          <p className={`text-2xl font-mono font-semibold ${rateLimited > 0 ? 'text-yellow-400' : 'text-[#f0f0f4]'}`}>
            {rateLimited.toLocaleString()}
          </p>
          <p className="text-[10px] text-[#55556a] mt-1">429 responses issued</p>
        </div>
        <div className="bg-[#16161e] border border-[#22222e] rounded-lg p-4">
          <p className="text-[10px] text-[#55556a] uppercase tracking-widest font-mono mb-2">RL Rate</p>
          <p className="text-2xl font-mono font-semibold text-[#f0f0f4]">{rlRate}%</p>
          <p className="text-[10px] text-[#55556a] mt-1">of all requests</p>
        </div>
        <div className="bg-[#16161e] border border-[#22222e] rounded-lg p-4">
          <p className="text-[10px] text-[#55556a] uppercase tracking-widest font-mono mb-2">Algorithm</p>
          <p className="text-sm font-semibold text-indigo-400">Token Bucket</p>
          <p className="text-[10px] text-[#55556a] mt-1">Atomic Lua · Redis</p>
        </div>
      </div>

      {/* Policies */}
      <div className="bg-[#16161e] border border-[#22222e] rounded-lg">
        <div className="px-4 py-3 border-b border-[#22222e]">
          <p className="text-xs font-medium text-[#8888a0] tracking-widest uppercase">Configured Policies</p>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {RATE_POLICIES.map(p => (
            <div key={p.role} className={`border rounded-lg p-3 ${p.bg}`}>
              <span className={`text-[10px] font-mono font-semibold tracking-widest ${p.color}`}>{p.role}</span>
              <p className="text-2xl font-mono font-semibold text-[#f0f0f4] mt-2">{p.limit}</p>
              <p className="text-[10px] text-[#55556a] mt-1">requests / {p.window}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Architecture explanation */}
      <div className="bg-[#16161e] border border-[#22222e] rounded-lg p-4">
        <p className="text-xs font-medium text-[#8888a0] tracking-widest uppercase mb-4">Architecture</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-red-500/10 flex items-center justify-center">
                <span className="text-red-400 text-xs">R</span>
              </div>
              <p className="text-xs font-semibold text-[#f0f0f4]">Redis Backend</p>
            </div>
            <p className="text-xs text-[#55556a] leading-relaxed pl-8">
              All rate limit counters stored in Redis with TTL-based expiry. Survives gateway restarts.
            </p>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-blue-500/10 flex items-center justify-center">
                <span className="text-blue-400 text-xs">TB</span>
              </div>
              <p className="text-xs font-semibold text-[#f0f0f4]">Token Bucket</p>
            </div>
            <p className="text-xs text-[#55556a] leading-relaxed pl-8">
              Each identity gets a bucket. Tokens refill continuously. Allows controlled bursts.
            </p>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-green-500/10 flex items-center justify-center">
                <span className="text-green-400 text-xs">LU</span>
              </div>
              <p className="text-xs font-semibold text-[#f0f0f4]">Atomic Lua Script</p>
            </div>
            <p className="text-xs text-[#55556a] leading-relaxed pl-8">
              Check-and-decrement is a single Redis EVAL call. No race conditions. Fail-open on Redis downtime.
            </p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-[#1a1a24]">
          <p className="text-[10px] text-[#55556a] font-mono">Rate limit key format:</p>
          <div className="mt-2 space-y-1">
            {[
              'ratelimit:anonymous:{ip}',
              'ratelimit:user:{userId}',
              'ratelimit:premium:{userId}',
              'ratelimit:admin:{userId}',
            ].map(k => (
              <code key={k} className="block text-[10px] font-mono text-indigo-300 bg-[#111118] px-2 py-1 rounded border border-[#1a1a24]">
                {k}
              </code>
            ))}
          </div>
          <p className="text-[10px] text-[#55556a] mt-3">
            Response headers: <code className="font-mono text-[#8888a0]">X-RateLimit-Remaining</code>, <code className="font-mono text-[#8888a0]">Retry-After</code>
          </p>
        </div>
      </div>
    </div>
  );
}
