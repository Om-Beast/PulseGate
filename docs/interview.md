# PulseGate — Interview Q&A

> Concise answers matched to the actual implementation in this codebase.

---

## Why an API Gateway?

A gateway is the single entry point for all client traffic. It centralises concerns that would otherwise be duplicated across every service: authentication, rate limiting, routing, observability, and load balancing. Without it, every service would need to implement JWT verification, Redis-based rate limiting, and request correlation independently.

**In PulseGate:** The gateway (`gateway/src/app.ts`) handles auth → rate limit → route → load balance → proxy in one pipeline before a single line of business logic runs in a downstream service.

---

## Why Redis for rate limiting?

In-memory counters die on restart and can't be shared across gateway replicas. Redis provides:
- **Persistence** across gateway restarts
- **Atomicity** via EVAL (Lua scripts run as single transactions, no race conditions)
- **TTL-based expiry** — no manual cleanup needed

**Fail-open design:** If Redis is unavailable, `redisRateLimiter.ts` fails open — requests proceed rather than blocking all traffic. This is the correct trade-off for an API gateway.

---

## Why Token Bucket (not fixed window)?

Fixed window counters allow burst attacks at window boundaries (100 req at 00:59 + 100 at 01:00 = 200 req in 2 seconds). Token Bucket:
- Allows **controlled bursts** up to the bucket size
- Refills **continuously** rather than resetting at a hard boundary
- Better models real-world API usage patterns

**Implementation:** Single Redis EVAL call — check remaining tokens, decrement atomically, return remaining. See `gateway/src/rateLimiter/redisRateLimiter.ts`.

---

## Why Round Robin?

Round Robin is O(1), stateless per request, and distributes load uniformly under equal-capacity instances. More complex algorithms (least-connections, weighted) require state that must be maintained and synchronized — overkill for this scale.

**Key design decision:** The counter is per-service, not global, so `user-service` and `order-service` maintain independent rotation state.

---

## Why health checks?

The load balancer only knows an instance is down if it's told. Without proactive health checks:
- The gateway would route to a dead instance
- Users would see timeouts or 502s
- Recovery would require manual intervention

**In PulseGate:** `healthChecker.ts` polls `GET /health` on every instance every 5 seconds. Failures and recoveries are tracked with hysteresis to prevent flapping.

---

## What happens when an instance fails?

1. `healthChecker.ts` calls `GET /health` on the instance
2. Three consecutive failures → `backendRegistry.markUnhealthy(instanceId)`
3. `backendRegistry.getHealthyInstances()` excludes it
4. `roundRobinLB.selectInstance()` only selects from the healthy list
5. Traffic is transparently rerouted to remaining instances
6. `metrics.recordBackendFailure()` increments the failure counter
7. The dashboard Failures page shows the instance as UNHEALTHY

**Retry:** For GET/HEAD/OPTIONS, the gateway retries once on a different instance before returning 503.

---

## How does recovery work?

1. Health checker continues polling unhealthy instances
2. Two consecutive successful `GET /health` responses → `backendRegistry.markHealthy(instanceId)`
3. Instance re-enters `getHealthyInstances()` pool
4. Next round-robin selection can include it
5. The dashboard shows the instance as HEALTHY with recovery count

**Hysteresis reason:** Requiring 2 successes (not just 1) prevents flapping when an instance is intermittently healthy.

---

## Why no POST retry?

POST requests are not idempotent — retrying a POST could create duplicate resources (double order, duplicate payment). Only safe HTTP methods (GET, HEAD, OPTIONS) are retried on backend failure.

---

## How is correlation maintained across services?

Every request gets a UUID assigned by `correlationId.ts` middleware. It:
1. Checks for an incoming `X-Request-Id` header (preserves client-provided ID)
2. Generates a new UUID v4 if none provided
3. Attaches it to `req.requestId`
4. Sets `X-Request-Id` on the response
5. Forwards it as `x-request-id` to backend services

Every log line, metric record, and error response includes this ID. A single request can be traced end-to-end through structured JSON logs.

---

## How are metrics calculated?

All metrics are in-memory in `MetricsCollector`:

- **Counters**: `totalRequests`, `successfulRequests`, `clientErrors`, `serverErrors`, `rateLimitedRequests` — incremented per request
- **Percentiles**: Latency values stored in a bounded array (max 10,000). P50/P95/P99 computed on-demand by sorting and indexing
- **Time-series**: `snapshotTimeSeries()` called every 5 seconds captures interval request count + latency percentiles → 60-point rolling window (5 minutes)
- **Per-route/per-backend**: Hash maps keyed by normalized route and instance ID

**Trade-off:** In-memory means metrics reset on restart. For production, you'd push to Prometheus/InfluxDB.

---

## What are current limitations?

| Limitation | Description | Production fix |
|---|---|---|
| Single gateway | No horizontal scaling | Multiple gateway instances behind a load balancer |
| In-memory metrics | Reset on restart | Push to Prometheus/Datadog |
| In-memory auth (postgres) | Single DB | Read replicas, connection pooling |
| No circuit breaker | Only health checks | Add circuit breaker with half-open state |
| No request tracing | Request ID only | OpenTelemetry distributed tracing |
| No TLS termination | HTTP only | Terminate TLS at gateway or upstream LB |
| Time-series in-memory | 5-min window | TimescaleDB or Prometheus for long-term retention |

---

## What would you do at larger scale?

1. **Multiple gateway instances** behind an external load balancer (nginx/ELB). Rate limit counters already in Redis — no code change needed.
2. **Service registry** (Consul/etcd) instead of hardcoded `SERVICES_CONFIG`
3. **Circuit breaker** pattern (half-open state) on top of the health checker
4. **Distributed tracing** via OpenTelemetry — plug into existing `X-Request-Id`
5. **Prometheus metrics endpoint** `/metrics` instead of in-memory only
6. **JWT validation via public key** (RS256) instead of shared secret
7. **mTLS** between gateway and backends in a Kubernetes environment

The core architecture (registry, load balancer, health checker, rate limiter) is already cleanly separated — each can be upgraded independently.
