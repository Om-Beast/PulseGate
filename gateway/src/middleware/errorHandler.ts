import { Request, Response, NextFunction } from 'express';
import { GatewayError } from '../errors/gatewayError';
import { logger } from '../logging/logger';

/**
 * Centralized Error Handler
 *
 * Express error middleware (4 parameters).
 * All gateway errors are funneled here.
 *
 * Rules:
 * - GatewayError: return structured { success, error, requestId }
 * - Unknown errors: log full details server-side, return generic INTERNAL_ERROR
 * - NEVER send stack traces to clients
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  const requestId = req.requestId ?? 'unknown';

  if (err instanceof GatewayError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
      requestId: err.requestId ?? requestId,
    });
    return;
  }

  // Unexpected error — log server-side, return generic response
  logger.error('Unhandled error', {
    requestId,
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
    requestId,
  });
}
