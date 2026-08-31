import { Request, Response, NextFunction } from 'express';
import { getRateLimitKey, getPolicy, checkRateLimit } from '../rateLimiter/redisRateLimiter';
import { rateLimitExceeded } from '../errors/gatewayError';
import { metrics } from '../metrics/metricsCollector';
import { logger } from '../logging/logger';

/**
 * Rate Limiting Middleware
 *
 * Uses Redis-backed token bucket to enforce per-identity rate limits.
 * Identity is derived from the authenticated user (or IP for anonymous).
 *
 * On exceeding limit:
 * - Sets Retry-After header (seconds until next allowed request)
 * - Returns 429 RATE_LIMIT_EXCEEDED
 *
 * Fails open if Redis is unavailable.
 */
export async function applyRateLimit(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const key = getRateLimitKey(req);
  const policy = getPolicy(req);

  const result = await checkRateLimit(key, policy);

  if (!result.allowed) {
    res.setHeader('Retry-After', String(result.retryAfter));
    res.setHeader('X-RateLimit-Remaining', '0');

    logger.warn('Rate limit exceeded', {
      requestId: req.requestId,
      key,
      retryAfter: result.retryAfter,
    });

    const err = rateLimitExceeded().withRequestId(req.requestId);
    next(err);
    return;
  }

  if (result.remaining >= 0) {
    res.setHeader('X-RateLimit-Remaining', String(result.remaining));
  }

  next();
}
