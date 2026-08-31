/**
 * PulseGate - Rate Limit Test
 *
 * Verifies that the distributed token-bucket rate limiter correctly
 * rejects requests beyond the configured thresholds.
 *
 * Run: k6 run load-tests/rate-limit.js
 *
 * Anonymous limit: 30 req/min = 0.5 req/sec
 * This test sends 60 requests quickly to trigger 429s.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';

const rateLimitedCount = new Counter('rate_limited_responses');
const allowedCount = new Counter('allowed_responses');
const rateLimitHitRate = new Rate('rate_limit_hit_rate');

export const options = {
  // Single VU, many iterations to exhaust rate limit
  vus: 1,
  iterations: 60,

  thresholds: {
    // We EXPECT some 429s - the rate limiter must work
    rate_limited_responses: ['count>0'],
    // But not ALL requests should be rate limited
    allowed_responses: ['count>5'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Use a unique IP fingerprint by not providing auth
// This tests the anonymous rate limit (30 req/min)
const HEADERS = { 'Content-Type': 'application/json' };

export function setup() {
  console.log('=== Rate Limit Test ===');
  console.log('Testing anonymous rate limit: 30 requests/minute');
  console.log(`Sending 60 requests rapidly to ${BASE_URL}/health`);
  console.log('Expect: first 30 succeed, subsequent requests hit 429');
  return {};
}

export default function () {
  // Hit the health endpoint as anonymous (no auth)
  // The gateway applies rate limiting even to /health... actually /health is public
  // So let's try the unauthenticated /api/users which hits the full middleware stack
  // Since /api/users requires auth, it returns 401 before rate limit
  // Instead, test the gateway rate limiting by calling /health rapidly
  // For proper rate-limit test, we need the full middleware stack

  // Strategy: call /health - it's public but still rate-limited
  // Or better: use a token for authenticated rate limiting test
  const res = http.get(`${BASE_URL}/health`, { headers: HEADERS });

  if (res.status === 429) {
    rateLimitedCount.add(1);
    rateLimitHitRate.add(1);

    // Verify the 429 response format
    check(res, {
      '429 has error code': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.error && body.error.code === 'RATE_LIMIT_EXCEEDED';
        } catch { return false; }
      },
      '429 has Retry-After header': (r) => r.headers['Retry-After'] !== undefined,
      '429 has requestId': (r) => {
        try {
          const body = JSON.parse(r.body);
          return typeof body.requestId === 'string';
        } catch { return false; }
      },
    });

    console.log(`Rate limited! Retry-After: ${res.headers['Retry-After']}s`);
  } else if (res.status === 200) {
    allowedCount.add(1);
    rateLimitHitRate.add(0);
    check(res, {
      'health check OK': (r) => r.status === 200,
    });
  } else {
    console.log(`Unexpected status: ${res.status}`);
  }

  // No sleep - we want to hit the rate limit quickly
}

export function teardown() {
  console.log('Rate limit test complete.');
  console.log('Check rate_limited_responses and allowed_responses metrics.');
}
