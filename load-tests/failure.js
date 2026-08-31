/**
 * PulseGate - Failure Scenario Test
 *
 * Tests gateway resilience when backend instances fail.
 *
 * Run: k6 run load-tests/failure.js
 *
 * Scenarios tested:
 * 1. Normal traffic (baseline)
 * 2. Traffic during backend disruption
 * 3. Recovery after backend restart
 *
 * Prerequisites:
 * - Docker stack running: npm run docker:up
 * - Get a JWT token first
 *
 * During the test, manually stop a backend:
 *   docker compose -f infra/docker/docker-compose.yml stop user-service-2
 *
 * Then restart it:
 *   docker compose -f infra/docker/docker-compose.yml start user-service-2
 *
 * The gateway's health checker should automatically detect failures
 * and route traffic only to healthy instances.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';

const serviceUnavailableCount = new Counter('service_unavailable_503');
const successCount = new Counter('success_responses');
const failureCount = new Counter('failure_responses');
const latencyWithFailure = new Trend('latency_with_failure_ms');

export const options = {
  stages: [
    { duration: '30s', target: 5 },   // Baseline: 5 users
    { duration: '1m', target: 5 },    // Hold (this is when you stop a backend manually)
    { duration: '30s', target: 5 },   // Recovery phase (restart the backend)
    { duration: '30s', target: 0 },   // Wind down
  ],
  thresholds: {
    // Even with one instance down, most requests should succeed
    // (because round robin routes to remaining healthy instances)
    success_responses: ['count>10'],
    // Gateway should NOT return 500 - it should return 503 for unavailable
    http_req_failed: ['rate<0.8'],  // Allow high failure rate during disruption
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const TOKEN = __ENV.TOKEN || '';

export function setup() {
  let token = TOKEN;

  if (!token) {
    // Try to get a token
    const loginRes = http.post(
      `${BASE_URL}/auth/login`,
      JSON.stringify({ email: 'admin@example.com', password: 'adminpassword123' }),
      { headers: { 'Content-Type': 'application/json' } }
    );

    if (loginRes.status === 200) {
      token = JSON.parse(loginRes.body).data.token;
    } else {
      // Register first
      const regRes = http.post(
        `${BASE_URL}/auth/register`,
        JSON.stringify({
          name: 'Failure Test User',
          email: `failure-test-${Date.now()}@example.com`,
          password: 'testpassword123',
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
      if (regRes.status === 201) {
        token = JSON.parse(regRes.body).data.token;
      }
    }
  }

  console.log('=== Failure Scenario Test ===');
  console.log('');
  console.log('Instructions:');
  console.log('1. During stage 2 (1 minute hold), stop a backend:');
  console.log('   docker compose -f infra/docker/docker-compose.yml stop user-service-2');
  console.log('');
  console.log('2. During stage 3 (recovery), restart it:');
  console.log('   docker compose -f infra/docker/docker-compose.yml start user-service-2');
  console.log('');
  console.log('Watch the instance field in responses to see round-robin behavior.');
  console.log(`Token available: ${!!token}`);

  return { token };
}

export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
    ...(data.token ? { Authorization: `Bearer ${data.token}` } : {}),
  };

  // Continuously request users endpoint
  const res = http.get(`${BASE_URL}/api/users`, { headers });

  latencyWithFailure.add(res.timings.duration);

  if (res.status === 200) {
    successCount.add(1);
    const body = JSON.parse(res.body);

    check(res, {
      'request succeeded': (r) => r.status === 200,
      'response has instance': () => typeof body.instance === 'string',
      'response has service': () => body.service === 'user-service',
    });

    console.log(`OK [${res.timings.duration.toFixed(0)}ms] -> instance: ${body.instance}`);

  } else if (res.status === 503) {
    serviceUnavailableCount.add(1);
    failureCount.add(1);

    check(res, {
      '503 has error code': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.error && body.error.code === 'SERVICE_UNAVAILABLE';
        } catch { return false; }
      },
    });

    console.log(`503 SERVICE_UNAVAILABLE - all backends unhealthy`);

  } else if (res.status === 401) {
    console.log('401 - no auth token, expected');
  } else {
    failureCount.add(1);
    console.log(`Unexpected status: ${res.status} - ${res.body.substring(0, 100)}`);
  }

  sleep(1);
}

export function teardown() {
  console.log('');
  console.log('=== Failure Test Complete ===');
  console.log('Review success_responses and service_unavailable_503 metrics.');
}
