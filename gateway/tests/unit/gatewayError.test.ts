import {
  GatewayError,
  routeNotFound,
  serviceUnavailable,
  rateLimitExceeded,
  invalidToken,
  unauthorized,
  forbidden,
  requestTimeout,
  badRequest,
  internalError,
} from '../../src/errors/gatewayError';

describe('GatewayError', () => {
  it('is an instance of Error', () => {
    const err = routeNotFound('/test');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(GatewayError);
  });

  it('routeNotFound returns 404', () => {
    const err = routeNotFound('/api/missing');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('ROUTE_NOT_FOUND');
    expect(err.message).toContain('/api/missing');
  });

  it('serviceUnavailable returns 503', () => {
    const err = serviceUnavailable('user-service');
    expect(err.statusCode).toBe(503);
    expect(err.code).toBe('SERVICE_UNAVAILABLE');
  });

  it('rateLimitExceeded returns 429', () => {
    const err = rateLimitExceeded();
    expect(err.statusCode).toBe(429);
    expect(err.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('invalidToken returns 401', () => {
    const err = invalidToken('expired');
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('INVALID_TOKEN');
  });

  it('unauthorized returns 401', () => {
    const err = unauthorized();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
  });

  it('forbidden returns 403', () => {
    const err = forbidden('admin');
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });

  it('requestTimeout returns 504', () => {
    const err = requestTimeout();
    expect(err.statusCode).toBe(504);
    expect(err.code).toBe('REQUEST_TIMEOUT');
  });

  it('badRequest returns 400', () => {
    const err = badRequest('Name is required');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('BAD_REQUEST');
    expect(err.message).toBe('Name is required');
  });

  it('internalError returns 500', () => {
    const err = internalError();
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe('INTERNAL_ERROR');
  });

  it('withRequestId attaches requestId', () => {
    const err = routeNotFound().withRequestId('req-123');
    expect(err.requestId).toBe('req-123');
  });

  it('preserves the error name', () => {
    expect(routeNotFound().name).toBe('GatewayError');
  });
});
