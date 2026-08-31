import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Correlation ID Middleware
 *
 * Each request gets a unique requestId for tracing across services.
 * - If the client sends X-Request-Id, we preserve it
 * - Otherwise we generate a UUID v4
 * - The ID is attached to req.requestId and returned in X-Request-Id response header
 * - Backends receive it via the X-Request-Id forwarded header (set in proxyRequest)
 */
export function correlationId(req: Request, res: Response, next: NextFunction): void {
  const existing = req.headers['x-request-id'] as string | undefined;
  const requestId = (existing && existing.length > 0) ? existing : uuidv4();

  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  next();
}
