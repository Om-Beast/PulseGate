import { GatewayErrorCode } from '../types';

export class GatewayError extends Error {
  public readonly code: GatewayErrorCode;
  public readonly statusCode: number;
  public requestId?: string;

  constructor(code: GatewayErrorCode, message: string, statusCode: number) {
    super(message);
    this.name = 'GatewayError';
    this.code = code;
    this.statusCode = statusCode;
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, GatewayError.prototype);
  }

  withRequestId(requestId: string): this {
    this.requestId = requestId;
    return this;
  }
}

// ─── Factory Functions ─────────────────────────────────────────────────────────

export function routeNotFound(path?: string): GatewayError {
  return new GatewayError(
    'ROUTE_NOT_FOUND',
    path ? `No route configured for path: ${path}` : 'Route not found',
    404,
  );
}

export function serviceUnavailable(service?: string): GatewayError {
  return new GatewayError(
    'SERVICE_UNAVAILABLE',
    service
      ? `No healthy instances available for service: ${service}`
      : 'Service temporarily unavailable',
    503,
  );
}

export function rateLimitExceeded(): GatewayError {
  return new GatewayError('RATE_LIMIT_EXCEEDED', 'Too many requests', 429);
}

export function invalidToken(reason?: string): GatewayError {
  return new GatewayError(
    'INVALID_TOKEN',
    reason ? `Invalid token: ${reason}` : 'Invalid or expired token',
    401,
  );
}

export function unauthorized(): GatewayError {
  return new GatewayError(
    'UNAUTHORIZED',
    'Authentication required. Provide a valid Bearer token.',
    401,
  );
}

export function forbidden(action?: string): GatewayError {
  return new GatewayError(
    'FORBIDDEN',
    action ? `Insufficient permissions for: ${action}` : 'Insufficient permissions',
    403,
  );
}

export function requestTimeout(): GatewayError {
  return new GatewayError('REQUEST_TIMEOUT', 'Backend request timed out', 504);
}

export function badRequest(message?: string): GatewayError {
  return new GatewayError('BAD_REQUEST', message ?? 'Bad request', 400);
}

export function internalError(message?: string): GatewayError {
  return new GatewayError('INTERNAL_ERROR', message ?? 'Internal server error', 500);
}
