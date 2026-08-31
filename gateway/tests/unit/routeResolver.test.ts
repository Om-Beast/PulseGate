import { resolveRoute } from '../../src/config/routes';

describe('resolveRoute', () => {
  it('resolves /api/users to user-service', () => {
    const route = resolveRoute('/api/users');
    expect(route).not.toBeNull();
    expect(route?.service).toBe('user-service');
    expect(route?.strip).toBe('/api');
  });

  it('resolves /api/users/123 to user-service', () => {
    const route = resolveRoute('/api/users/123');
    expect(route).not.toBeNull();
    expect(route?.service).toBe('user-service');
  });

  it('resolves /api/orders to order-service', () => {
    const route = resolveRoute('/api/orders');
    expect(route?.service).toBe('order-service');
  });

  it('resolves /api/orders/abc to order-service', () => {
    const route = resolveRoute('/api/orders/abc');
    expect(route?.service).toBe('order-service');
  });

  it('resolves /api/products to product-service', () => {
    const route = resolveRoute('/api/products');
    expect(route?.service).toBe('product-service');
  });

  it('resolves /api/products/99 to product-service', () => {
    const route = resolveRoute('/api/products/99');
    expect(route?.service).toBe('product-service');
  });

  it('returns null for unknown path', () => {
    expect(resolveRoute('/api/unknown')).toBeNull();
  });

  it('returns null for /health', () => {
    expect(resolveRoute('/health')).toBeNull();
  });

  it('returns null for empty path', () => {
    expect(resolveRoute('/')).toBeNull();
  });

  it('does not match partial prefix like /api/user (without s)', () => {
    expect(resolveRoute('/api/user')).toBeNull();
  });
});
