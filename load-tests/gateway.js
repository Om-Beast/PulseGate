/**
 * PulseGate - Gateway Load Test
 *
 * Tests normal API traffic through the gateway.
 * Run: k6 run load-tests/gateway.js
 *
 * Prerequisites:
 *   1. Start the stack: npm run docker:up
 *   2. Register a user and get a token (see below)
 *   3. Replace TOKEN below with a valid JWT
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('error_rate');
const gatewayLatency = new Trend('gateway_latency_ms');
const requestsTotal = new Counter('requests_total');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up to 10 users
    { duration: '1m', target: 10 },    // Hold at 10 users
    { duration: '30s', target: 50 },   // Ramp up to 50 users
    { duration: '1m', target: 50 },    // Hold at 50 users
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // 95% of requests must complete within 2s
    error_rate: ['rate<0.05'],          // Error rate must be below 5%
    http_req_failed: ['rate<0.1'],      // HTTP failures below 10%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Replace with a valid JWT token for authenticated requests
// Get one by: POST /auth/login -> { data: { token } }
const TOKEN = __ENV.TOKEN || '';

const HEADERS_AUTH = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${TOKEN}`,
};

const HEADERS_NO_AUTH = {
  'Content-Type': 'application/json',
};

export function setup() {
  // Register a test user if TOKEN not provided
  if (!TOKEN) {
    const registerRes = http.post(
      `${BASE_URL}/auth/register`,
      JSON.stringify({
        name: 'K6 Load Test User',
        email: `k6-loadtest-${Date.now()}@example.com`,
        password: 'testpassword123',
      }),
      { headers: HEADERS_NO_AUTH }
    );

    if (registerRes.status === 201) {
      const body = JSON.parse(registerRes.body);
      return { token: body.data.token };
    }
    console.warn('Could not register test user. Proceeding without auth.');
    return { token: '' };
  }
  return { token: TOKEN };
}

export default function (data) {
  const headers = data.token
    ? { ...HEADERS_NO_AUTH, Authorization: `Bearer ${data.token}` }
    : HEADERS_NO_AUTH;

  // Test 1: Gateway health check (public, no auth needed)
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health check returns 200': (r) => r.status === 200,
    'health check response is ok': (r) => {
      const body = JSON.parse(r.body);
      return body.status === 'ok';
    },
  });
  errorRate.add(healthRes.status !== 200);
  gatewayLatency.add(healthRes.timings.duration);
  requestsTotal.add(1);

  sleep(0.5);

  if (!data.token) {
    // Without auth, we expect 401 on protected routes
    const noAuthRes = http.get(`${BASE_URL}/api/users`, { headers: HEADERS_NO_AUTH });
    check(noAuthRes, {
      'unauthenticated returns 401': (r) => r.status === 401,
    });
    sleep(1);
    return;
  }

  // Test 2: Get users (authenticated)
  const usersRes = http.get(`${BASE_URL}/api/users`, { headers });
  check(usersRes, {
    'GET /api/users returns 200': (r) => r.status === 200,
    'GET /api/users returns success': (r) => {
      const body = JSON.parse(r.body);
      return body.success === true;
    },
    'GET /api/users returns instance': (r) => {
      const body = JSON.parse(r.body);
      return typeof body.instance === 'string';
    },
  });
  errorRate.add(usersRes.status >= 400);
  gatewayLatency.add(usersRes.timings.duration);
  requestsTotal.add(1);

  sleep(0.5);

  // Test 3: Get orders
  const ordersRes = http.get(`${BASE_URL}/api/orders`, { headers });
  check(ordersRes, {
    'GET /api/orders returns 200': (r) => r.status === 200,
    'GET /api/orders returns success': (r) => {
      const body = JSON.parse(r.body);
      return body.success === true;
    },
  });
  errorRate.add(ordersRes.status >= 400);
  gatewayLatency.add(ordersRes.timings.duration);
  requestsTotal.add(1);

  sleep(0.5);

  // Test 4: Get products
  const productsRes = http.get(`${BASE_URL}/api/products`, { headers });
  check(productsRes, {
    'GET /api/products returns 200': (r) => r.status === 200,
  });
  errorRate.add(productsRes.status >= 400);
  gatewayLatency.add(productsRes.timings.duration);
  requestsTotal.add(1);

  sleep(1);
}

export function teardown(data) {
  console.log(`Load test complete. Token used: ${data.token ? 'yes' : 'no'}`);
}
