# Distributed Rate Limiting in PulseGate

PulseGate implements a distributed Token Bucket rate limiter backed by Redis. This architecture prevents API abuse, protects downstream microservices from denial-of-service (DoS) conditions, and enforces role-based quality-of-service (QoS) guarantees.

---

## 1. Token Bucket Algorithm

The **Token Bucket** algorithm is an industry-standard rate limiting algorithm that permits bursts of traffic while enforcing a smooth sustained throughput over time.

### How It Works:
1. Each client identity is assigned a virtual bucket with a maximum **Capacity** ($C$) and a continuous **Refill Rate** ($r$ tokens per minute).
2. The bucket starts full with $C$ tokens.
3. When a request arrives at time $t_{\text{now}}$:
   - The number of new tokens generated since the last refill timestamp $t_{\text{last}}$ is calculated:
     $$\Delta t = t_{\text{now}} - t_{\text{last}}$$
     $$\text{newTokens} = \lfloor \Delta t \times \frac{r}{60} \rfloor$$
   - The token count is updated:
     $$\text{tokens} = \min(C, \text{tokens} + \text{newTokens})$$
   - If $\text{tokens} \ge 1$:
     - 1 token is deducted: $\text{tokens} \leftarrow \text{tokens} - 1$.
     - The request is allowed through.
   - If $\text{tokens} < 1$:
     - The request is rejected with HTTP `429 Too Many Requests`.
     - The required wait time until the next token is computed:
       $$\text{retryAfter} = \lceil \frac{60}{r} \rceil \text{ seconds}$$

```
+-------------------------------------------------------------+
|                        Token Bucket                         |
|                                                             |
|       Refill Stream: +r tokens/min                          |
|             |                                               |
|             v                                               |
|       +-----------+                                         |
|       |  *  *  *  |  <= Max Capacity (C tokens)             |
|       |  *  *  *  |                                         |
|       +-----+-----+                                         |
|             |                                               |
|             | Consume 1 token per request                   |
|             v                                               |
|       [Allowed / Rejected (429)]                            |
+-------------------------------------------------------------+
```

---

## 2. Why Redis?

1. **Distributed State:** When scaling PulseGate horizontally across multiple Node.js worker threads or container replicas behind an external load balancer, a centralized store ensures rate limits are enforced globally across all instances rather than per-process.
2. **Persistence Across Replicas & Restarts:** Gateway process restarts do not reset client usage quotas.
3. **Sub-Millisecond Evaluation:** In-memory key-value operations keep gateway latency overhead under 1ms.
4. **TTL Expiration:** Inactive rate limit keys automatically expire after 120 seconds, preventing unbounded memory growth.

---

## 3. Atomic Lua Script Evaluation

Evaluating and decrementing tokens requires a read-modify-write cycle. Performing this in separate Redis commands (`HMGET` followed by `HMSET`) would introduce race conditions under concurrent client requests.

PulseGate executes the entire Token Bucket logic inside a single, atomic Redis Lua script:

```lua
local tokens_key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local ttl = 120

local bucket = redis.call("HMGET", tokens_key, "tokens", "lastRefill")
local tokens = tonumber(bucket[1])
local lastRefill = tonumber(bucket[2])

if tokens == nil then
  tokens = capacity
  lastRefill = now
else
  local timePassed = now - lastRefill
  local newTokens = math.floor(timePassed * (refill_rate / 60))
  if newTokens > 0 then
    tokens = math.min(capacity, tokens + newTokens)
    lastRefill = now
  end
end

if tokens >= 1 then
  tokens = tokens - 1
  redis.call("HMSET", tokens_key, "tokens", tokens, "lastRefill", lastRefill)
  redis.call("EXPIRE", tokens_key, ttl)
  return {1, tokens, 0}
else
  local retryAfter = math.ceil(60 / refill_rate)
  return {0, tokens, retryAfter}
end
```

### Script Return Values:
- `{1, remaining_tokens, 0}`: Request is permitted.
- `{0, 0, retry_after_seconds}`: Request is rejected.

---

## 4. Rate Limiting Key Format

Keys in Redis are formatted by client identity and role:

```typescript
// src/rateLimiter/redisRateLimiter.ts
export function getRateLimitKey(req: Request): string {
  if (req.user) {
    return `ratelimit:${req.user.role.toLowerCase()}:${req.user.userId}`;
  }
  return `ratelimit:anonymous:${req.ip || 'unknown'}`;
}
```

### Key Examples:
- Authenticated User: `ratelimit:user:3fa85f64-5717-4562-b3fc-2c963f66afa6`
- Premium User: `ratelimit:premium:7a12b489-1234-5678-90ab-cdef12345678`
- Admin User: `ratelimit:admin:e987cba1-4321-8765-dcba-fedcba987654`
- Unauthenticated Client: `ratelimit:anonymous:192.168.1.50`

---

## 5. Tiered Rate Limit Policies

Limits are configured per role and evaluated per 60-second window:

| Role | Capacity (Burst) | Refill Rate | Window | Equivalent Throughput |
|------|-------------------|-------------|--------|-----------------------|
| `Anonymous` | 30 requests | 30 tokens/min | 60s | 0.5 requests/sec |
| `USER` | 100 requests | 100 tokens/min | 60s | 1.67 requests/sec |
| `PREMIUM` | 500 requests | 500 tokens/min | 60s | 8.33 requests/sec |
| `ADMIN` | 500 requests | 500 tokens/min | 60s | 8.33 requests/sec |

---

## 6. HTTP 429 Response Format & Headers

When a client exceeds their allowance, the gateway terminates the request before routing to any backend microservice.

### Response Headers
- `X-RateLimit-Remaining: 0`
- `Retry-After: 2` (Seconds until next token becomes available)
- `X-Request-Id: 8e5d6a21-9988-4c8d-b94f-4d691e847c12`

### Response Body (`HTTP 429 Too Many Requests`)
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded"
  },
  "requestId": "8e5d6a21-9988-4c8d-b94f-4d691e847c12"
}
```

---

## 7. Fail-Open Architecture

If Redis encounters a network partition, timeout, or crashes:
- PulseGate catches the connection error and logs it as a warning.
- The `checkRateLimit()` method falls back to **Fail-Open**:
  ```typescript
  if (redisClient.status !== 'ready') {
    return { allowed: true, remaining: policy.capacity, retryAfter: 0 };
  }
  ```
- **Rationale:** A temporary Redis failure does not bring down all business APIs; upstream services remain operational while alerts notify operators.

---

## 8. Testing Rate Limiting

### Testing with Bash / cURL
Send a burst of requests in a tight loop to trigger a 429:

```bash
# Rapidly fire 35 requests as anonymous user (limit: 30)
for i in {1..35}; do
  curl -s -o /dev/null -w "Request $i: HTTP %{http_code}\n" http://localhost:3000/health
done
```

**Output:**
```
Request 1: HTTP 200
...
Request 30: HTTP 200
Request 31: HTTP 429
Request 32: HTTP 429
Request 33: HTTP 429
Request 34: HTTP 429
Request 35: HTTP 429
```

### Testing with k6 Load Test
PulseGate includes a specialized k6 test script:

```bash
# Execute automated rate limit load test
k6 run load-tests/rate-limit.js
```

### Inspecting Rate Limit State in Redis
```bash
# Connect to Redis container
docker compose -f infra/docker/docker-compose.yml exec redis redis-cli

# List all rate limit keys
KEYS ratelimit:*

# Inspect bucket hash for a user
HGETALL ratelimit:user:3fa85f64-5717-4562-b3fc-2c963f66afa6
# Output:
# 1) "tokens"
# 2) "94"
# 3) "lastRefill"
# 4) "1725150240"
```
