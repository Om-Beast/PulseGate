# Load Balancing & Traffic Distribution in PulseGate

PulseGate includes a built-in, client-side/gateway-side Round Robin load balancer with health check integration and selective request retry capabilities for fault tolerance.

---

## 1. Round Robin Algorithm

Round Robin distributes requests evenly across a pool of backend servers in cyclic order.

### Mathematical Formulation
For a service with $N$ healthy instances indexed $0, 1, \dots, N-1$ and a monotonic counter $C$:

$$\text{Selected Index} = C \pmod N$$
$$C \leftarrow C + 1$$

```
Request 1 (C=0): Instance 0 (user-service-1)
Request 2 (C=1): Instance 1 (user-service-2)
Request 3 (C=2): Instance 2 (user-service-3)
Request 4 (C=3): Instance 0 (user-service-1)
```

---

## 2. Per-Service Independent Counters

Each backend service (`user-service`, `order-service`, `product-service`) maintains an isolated counter. Traffic sent to `user-service` does not advance or skew the rotation counter for `order-service`.

```typescript
// src/loadBalancer/roundRobin.ts
export class RoundRobinLoadBalancer implements ILoadBalancer {
  private counters: Map<string, number> = new Map();

  selectInstance(service: string, instances: ServiceInstance[]): ServiceInstance | null {
    const healthy = instances.filter(i => i.healthy);
    if (healthy.length === 0) return null;

    let counter = this.counters.get(service) || 0;
    const selected = healthy[counter % healthy.length];
    
    this.counters.set(service, counter + 1);
    
    return selected;
  }
}
```

---

## 3. Integration with Backend Health Checker

The load balancer operates directly on dynamic instance lists provided by the `BackendRegistry`:

1. **Filtering by Health State:** Before evaluating the modulo index, `selectInstance()` filters the candidate list to instances where `healthy === true`.
2. **Dynamic Pool Sizing:** If a cluster has 3 instances and 1 fails health checks, the pool size $N$ drops to 2. The load balancer automatically cycles across the remaining 2 healthy instances without manual intervention.

```
Initial Pool: [U1 (Healthy), U2 (Healthy), U3 (Healthy)] -> N=3
Round Robin Sequence: U1 -> U2 -> U3 -> U1 -> U2 -> U3

Failure Event: U2 becomes Unhealthy
Filtered Pool: [U1 (Healthy), U3 (Healthy)] -> N=2
Round Robin Sequence: U1 -> U3 -> U1 -> U3 -> U1
```

---

## 4. Failure Handling & Outage Scenarios

### Scenario A: Single Instance Unhealthy
- The unhealthy instance is skipped in subsequent routing cycles.
- Zero traffic is directed to the unhealthy instance until the background health checker verifies 2 consecutive successful health probes and marks it healthy.

### Scenario B: All Instances Unhealthy
- If all instances of a target service fail (`healthyInstances.length === 0`), `selectInstance()` returns `null`.
- The gateway immediately intercepts the request and responds with `503 Service Unavailable`:

```json
{
  "success": false,
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "Service user-service unavailable"
  },
  "requestId": "1a3b5c7d-8e9f-4a0b-1c2d-3e4f5a6b7c8d"
}
```

---

## 5. Automated Retry Logic

PulseGate incorporates an automatic failover retry mechanism inside `proxyRequest()`:

### Idempotency Enforcement:
- **Idempotent HTTP Methods (`GET`, `HEAD`, `OPTIONS`):**
  - If the initial target instance suffers a connection reset (`ECONNRESET`), TCP drop, or connection failure, the gateway:
    1. Marks the failed instance as unhealthy in the `BackendRegistry`.
    2. Re-queries the registry for remaining healthy instances.
    3. Selects the next instance via Round Robin.
    4. Automatically retries the request with `retries = 1`.
  - The client experiences no error and receives a `200 OK` response.

- **Non-Idempotent HTTP Methods (`POST`, `PUT`, `DELETE`, `PATCH`):**
  - **No automated retries are performed.**
  - **Rationale:** Retrying a non-idempotent request could cause duplicate records, double charges, or inconsistent state if the backend received the payload before failing.

```typescript
// src/app.ts
proxyReq.on('error', (err: any) => {
  logger.error('Proxy error', { error: err.message, instance: instance.id });
  backendRegistry.markUnhealthy(instance.id);
  
  if (retries > 0 && ['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const newInstances = backendRegistry.getHealthyInstances(instance.service);
    const newInstance = roundRobinLB.selectInstance(instance.service, newInstances);
    if (newInstance) {
      logger.info(`Retrying request on ${newInstance.id}`, { requestId: req.requestId });
      return proxyRequest(req, res, newInstance, strip, next, retries - 1);
    }
  }
  
  const statusCode = err.code === 'ECONNRESET' || err.message.includes('timeout') ? 504 : 503;
  next(statusCode === 504 ? requestTimeout() : serviceUnavailable(instance.service));
});
```

---

## 6. Why Round Robin is Appropriate

1. **Stateless Microservices:** PulseGate's backend services do not maintain in-process session state; any instance can fulfill any request.
2. **Uniform Resource Consumption:** CRUD operations on User, Order, and Product entities have predictable execution times.
3. **Zero Overhead:** Modulo arithmetic incurs negligible CPU cost.
4. **Predictability:** Deterministic rotation makes debugging and automated load testing straightforward.

---

## 7. How to Demo Round-Robin Load Balancing

### Step 1: Obtain a JWT Token
```bash
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"securepass123"}' \
  | grep -o '"token":"[^"]*' | cut -d'"' -f4)
```

### Step 2: Make Sequential Requests to `/api/users`
User service runs 3 instances (`user-service-1`, `user-service-2`, `user-service-3`):

```bash
for i in {1..6}; do
  curl -s http://localhost:3000/api/users \
    -H "Authorization: Bearer $TOKEN" \
    | grep -o '"instance":"[^"]*'
done
```

### Expected Output:
```
"instance":"user-service-1"
"instance":"user-service-2"
"instance":"user-service-3"
"instance":"user-service-1"
"instance":"user-service-2"
"instance":"user-service-3"
```
The rotation demonstrates sequential, round-robin load distribution.
