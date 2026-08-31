import { RouteConfig } from '../types';

// ─── Route Configuration ───────────────────────────────────────────────────────
// Maps URL prefixes to backend services.
// The 'strip' field is the prefix to remove before forwarding to the backend.
//
// Example: GET /api/users/123
//   -> strips '/api' -> forwards as GET /users/123 to user-service

export const ROUTE_CONFIG: Record<string, RouteConfig> = {
  '/api/users': {
    service: 'user-service',
    strip: '/api',
  },
  '/api/orders': {
    service: 'order-service',
    strip: '/api',
  },
  '/api/products': {
    service: 'product-service',
    strip: '/api',
  },
};

// Sorted by prefix length (longest first) for correct prefix matching.
const SORTED_ROUTES = Object.entries(ROUTE_CONFIG).sort(
  ([a], [b]) => b.length - a.length,
);

/**
 * Resolve a request path to a route configuration.
 * Returns null if no matching route is found.
 */
export function resolveRoute(path: string): RouteConfig | null {
  for (const [prefix, config] of SORTED_ROUTES) {
    if (path === prefix || path.startsWith(prefix + '/') || path.startsWith(prefix + '?')) {
      return config;
    }
  }
  return null;
}
