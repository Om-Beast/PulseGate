# PulseGate

[![CI](https://github.com/Om-Beast/PulseGate/actions/workflows/ci.yml/badge.svg)](https://github.com/Om-Beast/PulseGate/actions/workflows/ci.yml)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/typescript-5.x-blue)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

**Production-Style API Gateway & Traffic Manager**

PulseGate is a fully-featured API gateway built from first principles in Node.js and TypeScript. It demonstrates systems design concepts that power real infrastructure: JWT authentication with RBAC, Redis token-bucket rate limiting with atomic Lua scripts, round-robin load balancing with proactive health checking, and a real-time operational dashboard.

---

## Architecture

```
                      ┌─────────────────────────────────────────┐
                      │              PULSEGATE :3000              │
                      │                                           │
  CLIENT ─────────▶  │  Auth → Rate Limit → Route → LB → Proxy  │
                      │                                           │
                      └───────┬───────────┬───────────┬──────────┘
                              │           │           │
                         User Svc    Order Svc  Product Svc
                        (×3 inst)   (×2 inst)   (×2 inst)
                              │           │           │
                          PostgreSQL    Redis
                          (auth users)  (rate limits)
```

### Request Pipeline

```
CLIENT
  ↓
correlationId   → UUID assigned (or preserved from X-Request-Id)
  ↓
requestLogger   → structured JSON log on response finish
  ↓
/auth/*         → register / login (public)
  ↓
requireAuth     → JWT verification, attaches req.user
  ↓
applyRateLimit  → Redis token bucket (Lua script, per identity)
  ↓
resolveRoute    → longest-prefix match (/api/users → user-service)
  ↓
getHealthy      → instances in round-robin pool (unhealthy excluded)
  ↓
selectInstance  → round-robin counter per service
  ↓
proxyRequest    → Node http.request, retry once on GET/HEAD/OPTIONS
  ↓
BACKEND SERVICE
```

---

## Features

| Category | Implementation |
|---|---|
| **Authentication** | JWT (jsonwebtoken), bcrypt 12 rounds, PostgreSQL users |
| **Authorization** | RBAC: USER / ADMIN / PREMIUM roles |
| **Rate Limiting** | Redis token bucket, atomic Lua script, per-identity policies |
| **Load Balancing** | Round-robin, per-service counter, unhealthy instance skipping |
| **Health Checking** | Background poller (5s), 3-failure / 2-recovery hysteresis |
| **Observability** | P50/P95/P99 latency, request correlation, structured JSON logs |
| **Proxy** | Node.js built-in `http.request`, no external proxy library |
| **Dashboard** | React 18 + Vite, real-time polling, dark-mode control plane |
| **Tests** | 78/78 passing (unit + integration, Jest) |
| **Docker** | 11-service Compose stack with healthchecks |
| **CI** | GitHub Actions (build + test + Docker validate) |

---

## Rate Limit Policies

| Role | Limit | Window | Algorithm |
|---|---|---|---|
| Anonymous | 30 req | 1 min | Token bucket (Redis) |
| USER | 100 req | 1 min | Token bucket (Redis) |
| PREMIUM | 500 req | 1 min | Token bucket (Redis) |
| ADMIN | Unlimited | — | Bypass |

The check-and-decrement is a single atomic Redis `EVAL` call — no race conditions. The rate limiter **fails open** on Redis downtime to avoid blocking all traffic.

---

## Health Check State Machine

```
                 [3 consecutive failures]
  ● HEALTHY ────────────────────────────────▶ ● UNHEALTHY
  ▲             [2 consecutive successes]           │
  └──────────────────────────────────────────────────┘
                                 (removed from LB rotation while UNHEALTHY)
```

---

## Setup

### Prerequisites

- Node.js 20+
- Docker Desktop (for full stack)

### Local Development (without Docker)

```bash
git clone https://github.com/Om-Beast/PulseGate.git
cd PulseGate
npm install

# Set environment variables (copy from .env.example)
cp .env.example .env

# Build all packages
npm run build -w @pulsegate/gateway
npm run build -w @pulsegate/user-service
npm run build -w @pulsegate/order-service
npm run build -w @pulsegate/product-service

# Run tests
npm run test -w @pulsegate/gateway
npm run test -w @pulsegate/user-service

# Start gateway (requires Redis + PostgreSQL)
npm start -w @pulsegate/gateway
```

### Docker (Recommended)

```bash
docker compose -f infra/docker/docker-compose.yml up --build -d
docker compose -f infra/docker/docker-compose.yml ps
```

**Services after startup:**

| Service | URL |
|---|---|
| Gateway | http://localhost:3000 |
| Dashboard | http://localhost:8080 |
| User Service 1 | http://localhost:3001 |
| User Service 2 | http://localhost:3002 |
| User Service 3 | http://localhost:3003 |
| Order Service 1 | http://localhost:3004 |
| Order Service 2 | http://localhost:3005 |
| Product Service 1 | http://localhost:3006 |
| Product Service 2 | http://localhost:3007 |

---

## Authentication

### Register (creates USER role by default)

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@example.com","password":"Admin123!"}'
```

### Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin123!"}'
# Returns: { "success": true, "data": { "token": "...", "user": {...} } }
```

### Use the token

```bash
TOKEN="<your JWT here>"
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/users
```

### Access admin endpoints (requires ADMIN role in DB)

```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/admin/metrics
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/admin/services
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/admin/requests
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/admin/health
```

---

## Dashboard

Open **http://localhost:8080** (requires Docker stack).

Log in with an ADMIN account to see:

- **Command Center** — system status, KPI cards, traffic chart, latency chart, backend fleet, request pipeline diagram, recent requests
- **Traffic** — full-height charts, per-route breakdown
- **Services** — instance-level health with request counts and failure history
- **Rate Limits** — configured policies, architecture explanation
- **Requests** — filterable request log with click-to-expand detail drawer
- **Failures** — real-time unhealthy instance list, health check algorithm, error events
- **System** — gateway info, Node.js version, uptime, memory, configuration

---

## Failure Demo

```bash
# Stop one backend instance
docker compose -f infra/docker/docker-compose.yml stop user-service-2

# Wait ~15 seconds (3 health check cycles)
# Dashboard Failures page shows user-service-2 as UNHEALTHY

# Send traffic — it routes to user-service-1 and user-service-3 only
for i in 1 2 3 4 5 6; do
  curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/users
done

# Recover
docker compose -f infra/docker/docker-compose.yml start user-service-2
# Wait ~10 seconds (2 recovery cycles)
# Dashboard shows user-service-2 as HEALTHY
```

---

## Rate Limit Demo

```bash
# Without authentication: limit is 30 req/min
# Send 31 rapid requests to trigger 429
for i in $(seq 1 35); do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/users
done
# Should see 429 responses with Retry-After header
```

---

## Testing

```bash
# All 78 tests
npm run test -w @pulsegate/user-service
npm run test -w @pulsegate/order-service
npm run test -w @pulsegate/product-service
npm run test -w @pulsegate/gateway

# Gateway tests only (unit + integration)
npm run test:unit -w @pulsegate/gateway
npm run test:integration -w @pulsegate/gateway
```

---

## Load Testing (k6)

```bash
# Install k6: https://k6.io/docs/getting-started/installation/

k6 run load-tests/gateway.js        # General gateway load
k6 run load-tests/rate-limit.js     # Rate limit trigger test
k6 run load-tests/failure.js        # Failure + recovery scenario
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 |
| Language | TypeScript 5 |
| Gateway Framework | Express 4 |
| Authentication | JWT (jsonwebtoken) + bcrypt |
| Database | PostgreSQL 16 |
| Cache / Rate Limiting | Redis 7 |
| Dashboard | React 18 + Vite + Tailwind CSS + Recharts |
| Testing | Jest + Supertest + ts-jest |
| Containerization | Docker + Docker Compose |
| CI | GitHub Actions |

---

## Project Structure

```
PulseGate/
├── gateway/              # API gateway
│   ├── src/
│   │   ├── auth/         # JWT, bcrypt, PostgreSQL auth
│   │   ├── config/       # Routes, services, settings
│   │   ├── errors/       # GatewayError with factory functions
│   │   ├── health/       # HealthChecker state machine
│   │   ├── loadBalancer/ # Round-robin implementation
│   │   ├── logging/      # Structured JSON logger
│   │   ├── metrics/      # MetricsCollector + time-series
│   │   ├── middleware/    # auth, rateLimit, correlationId, errorHandler
│   │   ├── rateLimiter/  # Redis token bucket (Lua script)
│   │   ├── registry/     # BackendRegistry
│   │   ├── routing/      # Route resolver
│   │   ├── app.ts        # Express app + proxy handler
│   │   └── server.ts     # Startup + graceful shutdown
│   └── tests/
│       ├── unit/         # 41 unit tests
│       └── integration/  # 19 integration tests
├── services/
│   ├── user-service/     # Users CRUD (3 instances)
│   ├── order-service/    # Orders CRUD (2 instances)
│   └── product-service/  # Products CRUD (2 instances)
├── dashboard/            # React control plane
│   └── src/
│       ├── components/   # KpiCard, StatusBadge, Charts, Skeleton, etc.
│       ├── pages/        # CommandCenter, Traffic, Services, Failures, etc.
│       ├── hooks/        # useDashboardData (5s polling)
│       ├── contexts/     # AuthContext, DashboardContext
│       └── lib/          # API client with Bearer auth
├── infra/docker/         # docker-compose.yml
├── load-tests/           # k6 scripts
├── docs/                 # Architecture, API, interview Q&A, resume claims
└── .github/workflows/    # GitHub Actions CI
```

---

## Design Decisions & Trade-offs

**No external proxy library** — Using Node's built-in `http.request` gives full control over headers, retries, and timeout handling. `http-proxy-middleware` adds complexity without meaningful benefit at this scale.

**In-memory metrics** — P50/P95/P99 percentiles are computed on-demand from a bounded latency array. This is intentionally simple — for production you'd push to Prometheus. The trade-off is acknowledged in `docs/interview.md`.

**Fail-open rate limiting** — When Redis is unavailable, requests proceed rather than returning 429. This prioritizes availability over strict enforcement, which is correct for most APIs.

**Hysteresis in health checking** — Requiring 3 failures to mark unhealthy and 2 successes to recover prevents flapping on transient network hiccups.

---

## Limitations

- Metrics reset on gateway restart (in-memory only)
- Single gateway instance (Redis rate limiter already supports multi-instance)
- No distributed tracing (X-Request-Id correlation only)
- No TLS termination (terminate upstream in production)
- No circuit breaker (health checker + retry handles most cases)

See `docs/interview.md` for full discussion.

---

## License

MIT © 2024 Om Beast
