# PulseGate Operational Failure Scenarios & Demos

This document provides step-by-step verification procedures for 9 critical traffic management, security, and failure scenarios in PulseGate.

---

## Setup & Prerequisites

Before running the demos:
1. Ensure the Docker Compose stack is running:
   ```bash
   docker compose -f infra/docker/docker-compose.yml up --build -d
   ```
2. Confirm all containers are healthy:
   ```bash
   docker compose -f infra/docker/docker-compose.yml ps
   ```

---

## Demo 1: Normal Traffic Flow

### What It Demonstrates
The happy path where an unauthenticated client registers an account, authenticates to obtain a JWT, and uses the token to query user, order, and product microservices.

### Commands

```bash
# 1. Register a test user
REGISTER_RES=$(curl -s -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Demo",
    "email": "alice.demo@example.com",
    "password": "demopassword123"
  }')

echo "$REGISTER_RES" | jq .

# 2. Extract JWT token
TOKEN=$(echo "$REGISTER_RES" | jq -r '.data.token')

# 3. Query Users
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/users | jq .

# 4. Query Orders
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/orders | jq .

# 5. Query Products
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/products | jq .
```

### Expected Output
- Registration returns `201 Created` with a valid JWT and user details.
- Each service query returns `200 OK` with `success: true`, service data array, and routing metadata (`service` and `instance` tags).

---

## Demo 2: Round-Robin Load Balancing

### What It Demonstrates
The gateway evenly distributes consecutive requests across all healthy backend instances of a microservice using an in-memory round-robin algorithm.

### Commands

```bash
# Send 6 consecutive GET requests to /api/users
for i in {1..6}; do
  curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/users \
    | jq -r '"Request \(.'service'): routed to \(.'instance')"'
done
```

### Expected Output
The requests alternate sequentially across the 3 user-service instances:
```
Request user-service: routed to user-service-1
Request user-service: routed to user-service-2
Request user-service: routed to user-service-3
Request user-service: routed to user-service-1
Request user-service: routed to user-service-2
Request user-service: routed to user-service-3
```

---

## Demo 3: Rate Limiting (HTTP 429)

### What It Demonstrates
Distributed token-bucket rate limiting enforced in Redis. When a client exceeds their allowance, the gateway returns HTTP `429 Too Many Requests` with a `Retry-After` header.

### Commands

```bash
# Anonymous rate limit is 30 requests/minute.
# Send 35 rapid requests to the public health endpoint:
for i in {1..35}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)
  echo "Request #$i -> HTTP $STATUS"
done

# Inspect the last rejected response with headers
curl -i http://localhost:3000/health
```

### Expected Output
- Requests 1 through 30 return `HTTP 200`.
- Requests 31 through 35 return `HTTP 429`.
- HTTP `429` response contains:
```http
HTTP/1.1 429 Too Many Requests
Retry-After: 2
Content-Type: application/json; charset=utf-8

{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded"
  },
  "requestId": "9426f8d0-23a9-4ec4-9e77-50571c360980"
}
```

---

## Demo 4: Invalid / Missing JWT Authentication (HTTP 401 & 403)

### What It Demonstrates
The gateway blocks unauthenticated requests, rejects invalid or forged JWT signatures, and prevents unauthorized standard users from accessing administrative endpoints.

### Commands

```bash
# 1. Request protected endpoint with no Authorization header
curl -i http://localhost:3000/api/users

# 2. Request with malformed / forged token
curl -i -H "Authorization: Bearer invalid.token.payload" http://localhost:3000/api/users

# 3. Standard USER attempting to access ADMIN endpoint
curl -i -H "Authorization: Bearer $TOKEN" http://localhost:3000/admin/services
```

### Expected Output

1. **No Authorization Header (`401 UNAUTHORIZED`):**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Unauthorized"
  },
  "requestId": "..."
}
```

2. **Malformed Token (`401 INVALID_TOKEN`):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Invalid or expired token"
  },
  "requestId": "..."
}
```

3. **Insufficient Permissions (`403 FORBIDDEN`):**
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Forbidden"
  },
  "requestId": "..."
}
```

---

## Demo 5: Backend Failure & Automatic Failover

### What It Demonstrates
When a backend instance crashes or becomes unresponsive:
1. Active GET requests automatically retry on another healthy instance.
2. The background health checker marks the failed instance unhealthy after 3 consecutive failed probes.
3. Subsequent traffic routes exclusively to surviving healthy instances.

### Commands

```bash
# 1. Stop user-service-2
docker compose -f infra/docker/docker-compose.yml stop user-service-2

# 2. Wait 15 seconds for health checker failure streak to reach 3
sleep 15

# 3. Send 6 requests to /api/users
for i in {1..6}; do
  curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/users \
    | jq -r '.instance'
done
```

### Expected Output
Traffic rotates exclusively between `user-service-1` and `user-service-3`:
```
user-service-1
user-service-3
user-service-1
user-service-3
user-service-1
user-service-3
```
`user-service-2` is completely bypassed.

---

## Demo 6: Backend Recovery & Reintegration

### What It Demonstrates
When a failed backend instance restarts:
1. The health checker probes `/health`.
2. After 2 consecutive successful responses, the instance is restored to `healthy = true`.
3. The load balancer seamlessly re-includes the recovered instance in the active pool.

### Commands

```bash
# 1. Restart user-service-2
docker compose -f infra/docker/docker-compose.yml start user-service-2

# 2. Wait 10 seconds for 2 successful health checks
sleep 10

# 3. Send 6 requests to /api/users
for i in {1..6}; do
  curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/users \
    | jq -r '.instance'
done
```

### Expected Output
All 3 instances participate in the round-robin distribution again:
```
user-service-1
user-service-2
user-service-3
user-service-1
user-service-2
user-service-3
```

---

## Demo 7: Gateway Timeout Handling (HTTP 504)

### What It Demonstrates
If a downstream backend server hangs or fails to respond within the configured timeout (`10000ms`), the gateway terminates the connection and returns HTTP `504 Gateway Timeout`.

### Commands

```bash
# Simulate a hanging backend by pausing user-service containers
docker compose -f infra/docker/docker-compose.yml pause user-service-1 user-service-2 user-service-3

# Execute request with timing
curl -i -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/users

# Unpause containers after test
docker compose -f infra/docker/docker-compose.yml unpause user-service-1 user-service-2 user-service-3
```

### Expected Output
After approximately 10 seconds, the gateway terminates the upstream socket and responds:
```http
HTTP/1.1 504 Gateway Timeout
Content-Type: application/json; charset=utf-8

{
  "success": false,
  "error": {
    "code": "REQUEST_TIMEOUT",
    "message": "Request timeout"
  },
  "requestId": "2f4e8b91-5a02-4c28-bf3a-67a90b4d1c3e"
}
```

---

## Demo 8: Unknown Route Resolution (HTTP 404)

### What It Demonstrates
Requests sent to undefined paths or unmatched prefixes are caught by the route resolver and return a standardized HTTP `404 Not Found` JSON error.

### Commands

```bash
# 1. Non-existent API path
curl -i -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/nonexistent

# 2. Arbitrary unregistered path
curl -i http://localhost:3000/v1/invalid/route
```

### Expected Output
```http
HTTP/1.1 404 Not Found
Content-Type: application/json; charset=utf-8

{
  "success": false,
  "error": {
    "code": "ROUTE_NOT_FOUND",
    "message": "Route not found"
  },
  "requestId": "5d2b7e19-913a-4467-8cfb-819a55e2d103"
}
```

---

## Demo 9: All Backends Unavailable (HTTP 503)

### What It Demonstrates
When all instances for a specific microservice are down or unhealthy, the gateway returns HTTP `503 Service Unavailable` with specific service degradation details rather than crashing.

### Commands

```bash
# 1. Stop all order-service instances
docker compose -f infra/docker/docker-compose.yml stop order-service-1 order-service-2

# 2. Wait 15 seconds for health checks to mark all instances unhealthy
sleep 15

# 3. Attempt to query orders
curl -i -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/orders

# 4. Verify other services remain completely unaffected
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/users | jq .success

# 5. Restart order services
docker compose -f infra/docker/docker-compose.yml start order-service-1 order-service-2
```

### Expected Output
For `/api/orders`:
```http
HTTP/1.1 503 Service Unavailable
Content-Type: application/json; charset=utf-8

{
  "success": false,
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "Service order-service unavailable"
  },
  "requestId": "8f3e2b10-67a4-4a55-b41e-3a9b8d2e1c4f"
}
```

For `/api/users`:
```
true
```
The outage is isolated exclusively to the affected microservice.
