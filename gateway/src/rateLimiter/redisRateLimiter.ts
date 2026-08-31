import Redis from 'ioredis';
import { Request } from 'express';
import { config } from '../config/settings';
import { logger } from '../logging/logger';
import { AuthUser } from '../types';

// ─── Redis Connection ──────────────────────────────────────────────────────────

let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redis) {
    redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
      connectTimeout: 5000,
    });

    redis.on('connect', () => logger.info('Redis connected'));
    redis.on('error', (err) => logger.error('Redis error', { message: err.message }));
    redis.on('reconnecting', () => logger.warn('Redis reconnecting'));
  }
  return redis;
}

export async function connectRedis(): Promise<void> {
  try {
    await getRedisClient().connect();
  } catch (err) {
    logger.warn('Redis initial connection failed, will retry', {
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

// ─── Rate Limit Policies ───────────────────────────────────────────────────────

export interface RateLimitPolicy {
  capacity: number;   // Maximum tokens (= requests per window)
  refillRate: number; // Tokens added per second
}

const POLICIES: Record<string, RateLimitPolicy> = {
  anonymous: { capacity: 30, refillRate: 30 / 60 },   // 30 req/min
  USER: { capacity: 100, refillRate: 100 / 60 },       // 100 req/min
  PREMIUM: { capacity: 500, refillRate: 500 / 60 },    // 500 req/min
  ADMIN: { capacity: 500, refillRate: 500 / 60 },      // 500 req/min
};

export function getRateLimitKey(req: Request): string {
  const user = req.user as AuthUser | undefined;

  if (!user) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      ?? req.socket.remoteAddress
      ?? 'unknown';
    return `ratelimit:anonymous:${ip}`;
  }

  const prefix = user.role === 'PREMIUM' ? 'premium'
    : user.role === 'ADMIN' ? 'admin'
    : 'user';

  return `ratelimit:${prefix}:${user.userId}`;
}

export function getPolicy(req: Request): RateLimitPolicy {
  const user = req.user as AuthUser | undefined;
  if (!user) return POLICIES.anonymous;
  return POLICIES[user.role] ?? POLICIES.USER;
}

// ─── Lua Script (Atomic Token Bucket) ─────────────────────────────────────────
//
// The Lua script runs atomically in Redis, preventing race conditions.
// It implements the Token Bucket algorithm:
//   1. Get current state (tokens, lastRefill timestamp)
//   2. Calculate refill: elapsed_seconds * refillRate tokens were added
//   3. Cap tokens at capacity
//   4. If tokens >= 1: consume and return {allowed=1, remaining, retryAfter=0}
//   5. If tokens < 1: return {allowed=0, remaining=0, retryAfter=seconds_to_wait}
//
// KEYS[1] = rate limit key (e.g., "ratelimit:user:abc123")
// ARGV[1] = capacity (integer)
// ARGV[2] = refillRate (tokens per second, float)
// ARGV[3] = current timestamp (Unix seconds, float)
// ARGV[4] = TTL in seconds for key expiry

const TOKEN_BUCKET_SCRIPT = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refillRate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local ttl = tonumber(ARGV[4])

local data = redis.call('HMGET', key, 'tokens', 'lastRefill')
local tokens = tonumber(data[1])
local lastRefill = tonumber(data[2])

if tokens == nil then
  tokens = capacity
  lastRefill = now
end

local elapsed = now - lastRefill
local refilled = elapsed * refillRate
tokens = math.min(capacity, tokens + refilled)
lastRefill = now

local allowed = 0
local retryAfter = 0

if tokens >= 1 then
  tokens = tokens - 1
  allowed = 1
  retryAfter = 0
else
  allowed = 0
  retryAfter = math.ceil((1 - tokens) / refillRate)
end

redis.call('HSET', key, 'tokens', tokens, 'lastRefill', lastRefill)
redis.call('EXPIRE', key, ttl)

return {allowed, math.floor(tokens), retryAfter}
`;

// ─── Check Rate Limit ──────────────────────────────────────────────────────────

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
}

export async function checkRateLimit(
  key: string,
  policy: RateLimitPolicy,
): Promise<RateLimitResult> {
  const client = getRedisClient();

  try {
    const now = Date.now() / 1000; // Unix timestamp in seconds
    const ttl = Math.ceil(policy.capacity / policy.refillRate) * 2; // 2x refill time

    const result = await client.eval(
      TOKEN_BUCKET_SCRIPT,
      1,
      key,
      policy.capacity.toString(),
      policy.refillRate.toString(),
      now.toString(),
      ttl.toString(),
    ) as [number, number, number];

    return {
      allowed: result[0] === 1,
      remaining: result[1],
      retryAfter: result[2],
    };
  } catch (err) {
    // Fail open: if Redis is unavailable, allow the request
    logger.warn('Rate limiter Redis error, failing open', {
      key,
      message: err instanceof Error ? err.message : String(err),
    });
    return { allowed: true, remaining: -1, retryAfter: 0 };
  }
}
