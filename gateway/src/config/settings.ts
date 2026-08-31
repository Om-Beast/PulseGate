// ─── Application Configuration ────────────────────────────────────────────────
// All values come from environment variables with sensible defaults.
// NEVER hardcode secrets here. Use .env files for local development.

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

function envInt(key: string, fallback: number): number {
  const value = process.env[key];
  if (value === undefined) return fallback;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) return fallback;
  return parsed;
}

export const config = {
  port: envInt('GATEWAY_PORT', 3000),
  nodeEnv: process.env.NODE_ENV ?? 'development',

  // JWT secret — required in production, has a default for testing
  jwtSecret: process.env.JWT_SECRET ?? 'pulsegate-dev-secret-change-in-production',

  postgres: {
    host: process.env.POSTGRES_HOST ?? 'localhost',
    port: envInt('POSTGRES_PORT', 5432),
    database: process.env.POSTGRES_DB ?? 'pulsegate',
    user: process.env.POSTGRES_USER ?? 'pulsegate',
    password: process.env.POSTGRES_PASSWORD ?? 'pulsegate',
  },

  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: envInt('REDIS_PORT', 6379),
  },

  gateway: {
    // Backend request timeout in milliseconds
    timeout: envInt('BACKEND_TIMEOUT', 10000),
    // Health check interval in milliseconds
    healthCheckInterval: envInt('HEALTH_CHECK_INTERVAL', 5000),
    // Rate limit window in milliseconds
    rateLimitWindowMs: 60000,
    // Maximum recent requests to keep in memory
    maxRecentRequests: 500,
  },
} as const;
