import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../auth/jwt';
import { unauthorized, invalidToken } from '../errors/gatewayError';
import { logger } from '../logging/logger';

/**
 * Authentication Middleware
 *
 * Verifies the JWT from the Authorization: Bearer <token> header.
 * On success: attaches the decoded payload to req.user
 * On failure: passes a GatewayError to the error handler
 *
 * IMPORTANT: This middleware NEVER trusts client-supplied X-User-Id or
 * X-User-Role headers. Those are set by the gateway after authentication.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(unauthorized().withRequestId(req.requestId));
  }

  const token = authHeader.slice(7); // Remove "Bearer "

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Token verification failed';
    logger.warn('JWT verification failed', { requestId: req.requestId, reason: message });
    next(invalidToken(message).withRequestId(req.requestId));
  }
}

/**
 * Optional Auth Middleware
 *
 * Sets req.user if a valid token is present, but does NOT fail if missing.
 * Used for endpoints that need to know the identity but allow anonymous access.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(); // No token — that's fine
  }

  const token = authHeader.slice(7);

  try {
    req.user = verifyToken(token);
  } catch {
    // Invalid token — ignore for optional auth
  }

  next();
}

/**
 * Admin Authorization Middleware
 *
 * Must be used AFTER requireAuth.
 * Allows only users with role === 'ADMIN'.
 */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    const { unauthorized: unauth } = require('../errors/gatewayError');
    return next(unauth().withRequestId(req.requestId));
  }

  if (req.user.role !== 'ADMIN') {
    const { forbidden } = require('../errors/gatewayError');
    return next(forbidden('admin endpoints').withRequestId(req.requestId));
  }

  next();
}
