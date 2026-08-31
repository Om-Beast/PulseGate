# PulseGate Developer Guide

This guide covers local development, environment configuration, testing, adding new microservices, running load tests, and troubleshooting common development issues.

---

## 1. Prerequisites

Ensure your development environment meets the following requirements:

- **Node.js:** v20.x LTS or higher (`node --version`)
- **npm:** v10.x or higher (`npm --version`)
- **Docker & Docker Compose:** Docker Desktop or Engine v24+ with Compose v2+ (`docker compose version`)
- **k6 (Optional, for load testing):** v0.48+ (`k6 version`)
- **cURL & jq (Recommended):** For manual API testing and JSON parsing

---

## 2. Clone & Initial Setup

```bash
# Clone the repository
git clone https://github.com/your-org/pulsegate.git
cd pulsegate

# Install all root dependencies and workspace packages
npm install
```

### Project Directory Layout
```
pulsegate/
├── docs/                      # Architecture, API, and Operational documentation
├── gateway/                   # Gateway package configuration
├── src/                       # Gateway core source code
│   ├── auth/                  # Authentication, JWT signing, password hashing
│   ├── config/                # Service endpoints, routes, settings
│   ├── errors/                # Standardized gateway error classes
│   ├── health/                # Periodic background health checker
│   ├── loadBalancer/          # Round Robin load balancer
│   ├── logging/               # Structured logging
│   ├── metrics/               # In-memory telemetry and stats collection
│   ├── middleware/            # Auth, RateLimit, Correlation ID, Logger, Errors
│   ├── registry/              # In-memory backend instance registry
│   ├── routing/               # URL prefix resolver
│   ├── app.ts                 # Express application definition
│   └── server.ts              # Gateway HTTP server bootstrap
├── services/                  # Microservices
│   ├── user-service/          # User CRUD microservice
│   ├── order-service/         # Order CRUD microservice
│   └── product-service/       # Product CRUD microservice
├── dashboard/                 # React & Vite operational dashboard
├── infra/
│   └── docker/
│       └── docker-compose.yml # Full-stack container orchestration
├── load-tests/                # k6 load testing scripts
└── tests/                     # Jest unit and integration tests
```

---

## 3. Environment Variables Reference

Create a `.env` file at the root or configure your environment according to the following matrix:

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `PORT` / `GATEWAY_PORT` | `3000` | Port for the PulseGate API Gateway |
| `NODE_ENV` | `development` | Runtime environment (`development`, `production`, `test`) |
| `JWT_SECRET` | `supersecret` | Secret key used for signing and verifying HMAC-SHA256 JWTs |
| `PG_HOST` / `POSTGRES_HOST` | `localhost` | PostgreSQL hostname (`postgres` inside Docker) |
| `PG_PORT` / `POSTGRES_PORT` | `5432` | PostgreSQL TCP port |
| `PG_DB` / `POSTGRES_DB` | `pulsegate` | PostgreSQL database name |
| `PG_USER` / `POSTGRES_USER` | `postgres` | PostgreSQL username (`pulsegate` in Docker) |
| `PG_PASSWORD` / `POSTGRES_PASSWORD` | `postgres` | PostgreSQL password (`pulsegate` in Docker) |
| `REDIS_HOST` | `localhost` | Redis server hostname (`redis` inside Docker) |
| `REDIS_PORT` | `6379` | Redis TCP port |
| `HEALTH_CHECK_INTERVAL` | `5000` | Interval in milliseconds between backend health checks |
| `BACKEND_TIMEOUT` | `10000` | Upstream backend HTTP request timeout in milliseconds |

---

## 4. Running with Docker Compose (Recommended)

Docker Compose starts the entire stack: PostgreSQL, Redis, 3 User Service instances, 2 Order Service instances, 2 Product Service instances, the API Gateway, and the Dashboard UI.

```bash
# Start all containers in background
docker compose -f infra/docker/docker-compose.yml up --build -d

# Check status of all containers
docker compose -f infra/docker/docker-compose.yml ps

# Follow logs across all services
docker compose -f infra/docker/docker-compose.yml logs -f

# Follow logs for the gateway specifically
docker compose -f infra/docker/docker-compose.yml logs -f gateway

# Stop all containers
docker compose -f infra/docker/docker-compose.yml down

# Stop and wipe persistent PostgreSQL volumes
docker compose -f infra/docker/docker-compose.yml down -v
```

---

## 5. Local Development without Docker

For rapid iterative debugging without rebuilding containers:

### Step 1: Start Infrastructure (Redis & Postgres)
```bash
docker compose -f infra/docker/docker-compose.yml up -d redis postgres
```

### Step 2: Start Microservices
Open separate terminal tabs:

```bash
# Tab 1: User Service (Instance 1)
cd services/user-service
PORT=4001 INSTANCE_ID=user-service-1 npm run dev

# Tab 2: Order Service (Instance 1)
cd services/order-service
PORT=4011 INSTANCE_ID=order-service-1 npm run dev

# Tab 3: Product Service (Instance 1)
cd services/product-service
PORT=4021 INSTANCE_ID=product-service-1 npm run dev
```

### Step 3: Start Gateway
```bash
# From project root
npm run dev
```

The gateway will start on `http://localhost:3000`.

### Step 4: Start Dashboard (Optional)
```bash
cd dashboard
npm install
npm run dev
```

---

## 6. Adding a New Microservice

To integrate a new microservice (e.g., `inventory-service` on port `4031`):

### Step 1: Create the Service Directory
Create `services/inventory-service` with its own `package.json`, `tsconfig.json`, `Dockerfile`, and `src/`:
Ensure it exposes:
- `GET /health` -> `{ status: 'ok', service: 'inventory-service' }`
- CRUD routes, e.g., `GET /inventory`, `POST /inventory`

### Step 2: Register the Service in Gateway Configuration
Update `src/config/services.ts`:

```typescript
export const SERVICES_CONFIG: Record<string, Array<{ id: string; host: string; port: number }>> = {
  // Existing services...
  'inventory-service': [
    { id: 'inventory-service-1', host: 'inventory-service-1', port: 4031 },
    { id: 'inventory-service-2', host: 'inventory-service-2', port: 4032 }
  ]
};
```

### Step 3: Define Route Mapping
Update `src/config/routes.ts`:

```typescript
export const ROUTE_CONFIG: Record<string, RouteConfig> = {
  // Existing routes...
  '/api/inventory': { service: 'inventory-service', strip: '/api' }
};
```

### Step 4: Add Containers to Docker Compose
Add definitions in `infra/docker/docker-compose.yml`:

```yaml
  inventory-service-1:
    build:
      context: ../../services/inventory-service
      dockerfile: Dockerfile
    environment:
      PORT: "4031"
      INSTANCE_ID: inventory-service-1
    networks:
      - pulsegate
```

---

## 7. Running Automated Tests

PulseGate includes unit and integration test suites powered by Jest and Supertest.

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run tests in watch mode during development
npx jest --watch
```

---

## 8. Running Load Tests with k6

PulseGate provides three pre-configured k6 scripts in `load-tests/`:

### Installing k6

- **macOS (Homebrew):** `brew install k6`
- **Windows (Winget):** `winget install k6`
- **Windows (Chocolatey):** `choco install k6`
- **Linux (Debian/Ubuntu):**
  ```bash
  sudo gpg -k
  sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
  echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
  sudo apt-get update && sudo apt-get install k6
  ```

### Executing Load Tests

```bash
# 1. Baseline Gateway Load Test (Ramping virtual users up to 50)
k6 run load-tests/gateway.js

# 2. Rate Limiting Test (Sends rapid requests to trigger 429s)
k6 run load-tests/rate-limit.js

# 3. Failure & Failover Test (Simulates traffic during backend outages)
k6 run load-tests/failure.js
```

---

## 9. Common Troubleshooting

### 1. Port Conflict (`EADDRINUSE`)
- **Symptom:** Gateway or services fail to start with `listen EADDRINUSE: address already in use :::3000` (or `4001`, `5432`, `6379`).
- **Fix:** Check running processes and stop existing instances:
  ```bash
  # Windows
  netstat -ano | findstr :3000
  taskkill /PID <PID> /F

  # macOS / Linux
  lsof -i :3000
  kill -9 <PID>
  ```

### 2. Database Connection Errors
- **Symptom:** Gateway logs `Failed to initialize database` or `ECONNREFUSED 127.0.0.1:5432`.
- **Fix:** Ensure PostgreSQL is healthy:
  ```bash
  docker compose -f infra/docker/docker-compose.yml exec postgres pg_isready -U pulsegate
  ```

### 3. Redis Connection Errors & Fail-Open Behavior
- **Symptom:** Gateway logs `Redis error: connect ECONNREFUSED`.
- **Fix:** If Redis is down, the gateway operates in fail-open mode, permitting traffic without rate limits. To restore rate limiting, start Redis:
  ```bash
  docker compose -f infra/docker/docker-compose.yml up -d redis
  ```

### 4. JWT Verification Failures (`401 INVALID_TOKEN`)
- **Symptom:** Authenticated API requests return `401 Invalid or expired token`.
- **Fix:** Ensure `JWT_SECRET` is identical across all environments and tokens are not expired (tokens have a 24-hour lifetime).
