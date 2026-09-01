import app from './app';
import { metrics } from './metrics/metricsCollector';
import { config } from './config/settings';
import { healthChecker } from './health/healthChecker';
import { connectRedis } from './rateLimiter/redisRateLimiter';
import { initDb, closeDb } from './auth/authService';
import { logger } from './logging/logger';

const PORT = Number(process.env.PORT) || config.port;

async function start(): Promise<void> {
  logger.info('PulseGate starting', {
    port: PORT,
    nodeEnv: config.nodeEnv,
    redisHost: config.redis.host,
    postgresHost: config.postgres.host,
  });

  // Initialize PostgreSQL schema
  try {
    await initDb();
  } catch (err) {
    logger.warn('Database initialization failed (will retry on next request)', {
      message: err instanceof Error ? err.message : String(err),
    });
  }

  // Connect to Redis (non-fatal - rate limiter fails open)
  await connectRedis();

  // Start background health checker (5s interval)
  healthChecker.start();

  // Time-series snapshot every 5 seconds for dashboard charts
  const tsInterval = setInterval(() => metrics.snapshotTimeSeries(), 5000);
  if (tsInterval.unref) tsInterval.unref();

  // Start HTTP server
  const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info('PulseGate gateway listening', { port: PORT });
  });

  // â”€â”€â”€ Graceful Shutdown â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async function shutdown(signal: string): Promise<void> {
    logger.info('Shutdown signal received', { signal });

    healthChecker.stop();
    clearInterval(tsInterval);

    server.close(async () => {
      await closeDb();
      logger.info('PulseGate shutdown complete');
      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000).unref();
  }

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', {
      reason: String(reason),
    });
  });
}

start().catch((err) => {
  logger.error('Fatal startup error', { message: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});

