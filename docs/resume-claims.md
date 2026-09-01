# PulseGate — Verified Resume Claims

> All claims below are verifiable in the codebase. No exaggeration.

---

## Bullet Points (Resume-Ready)

**Built a production-style API Gateway in Node.js/TypeScript** serving as a single entry point with JWT authentication (RBAC), Redis token-bucket rate limiting (atomic Lua scripts), and round-robin load balancing across 7 backend instances.

**Implemented proactive health monitoring** with a background health checker polling 7 backend instances every 5 seconds, using a 3-failure/2-recovery hysteresis state machine to prevent flapping.

**Designed a correlation-based observability system** propagating `X-Request-Id` through all request logs, metrics, and error responses, enabling full request tracing across the distributed system.

**Delivered a real-time operational dashboard** in React 18 + TypeScript with live traffic charts (5-minute rolling window), P50/P95/P99 latency visualization, backend fleet topology, and a polished dark-mode UI.

**Achieved 78/78 test pass rate** across unit and integration tests covering round-robin, route resolution, JWT auth, RBAC, rate limiting, health checks, correlation ID propagation, and metrics collection.

**Containerized a complete 11-service stack** (gateway, dashboard, Redis, PostgreSQL, 3×user-service, 2×order-service, 2×product-service) using Docker Compose with healthchecks and service dependencies.

---

## Technical Claims — Verified

| Claim | Evidence |
|---|---|
| JWT auth with role-based access (USER / ADMIN / PREMIUM) | `gateway/src/middleware/auth.ts`, `gateway/src/auth/jwt.ts` |
| Redis token bucket rate limiting | `gateway/src/rateLimiter/redisRateLimiter.ts` |
| Atomic Lua script (no race conditions) | See Lua script in redisRateLimiter.ts |
| Round-robin load balancer | `gateway/src/loadBalancer/roundRobin.ts` |
| Health checker with hysteresis (3 fail / 2 recover) | `gateway/src/health/healthChecker.ts` |
| Node.js built-in HTTP proxy (no http-proxy-middleware) | `gateway/src/app.ts` — `proxyRequest()` function |
| GET/HEAD/OPTIONS retry on backend failure | `gateway/src/app.ts` — retry block |
| Correlation ID middleware | `gateway/src/middleware/correlationId.ts` |
| Structured JSON logging with sensitive field redaction | `gateway/src/logging/logger.ts` |
| P50/P95/P99 percentile metrics | `gateway/src/metrics/metricsCollector.ts` |
| Rolling 5-minute time-series (60 points × 5s) | `metricsCollector.ts` — `snapshotTimeSeries()` |
| PostgreSQL auth with bcrypt (12 rounds) | `gateway/src/auth/authService.ts`, `gateway/src/auth/password.ts` |
| React dashboard with real-time polling (5s) | `dashboard/src/hooks/useDashboardData.ts` |
| Route-level code splitting (lazy loading) | `dashboard/src/App.tsx` |
| 78 passing tests | `npm run test` from workspace root |
| Docker Compose 11-service stack | `infra/docker/docker-compose.yml` |
| GitHub Actions CI | `.github/workflows/ci.yml` |
| k6 load tests | `load-tests/` |

---

## What is NOT claimed

- ❌ Kubernetes deployment (not implemented)
- ❌ Service mesh (not implemented)
- ❌ Distributed tracing (only correlation ID)
- ❌ Metrics persistence across restarts (in-memory only)
- ❌ mTLS between services (plain HTTP internally)
- ❌ Production-grade connection pooling (basic pg pool)
- ❌ Horizontal gateway scaling (single instance, Redis already supports it)
