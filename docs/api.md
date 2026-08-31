# PulseGate API Reference

This document provides complete specification for all public, protected, and administrative endpoints exposed by the PulseGate API Gateway.

---

## Global Response & Error Formats

### Standard Success Response
All gateway-routed microservice endpoints return a consistent JSON payload structure:
```json
{
  "success": true,
  "data": { ... },
  "service": "user-service",
  "instance": "user-service-1"
}
```

### Standard Error Response
When an error occurs within the gateway or is propagated from a downstream service, the response conforms to the following schema:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Descriptive error message"
  },
  "requestId": "c1f76d90-b9df-48c2-a968-3e4b8ef98b1d"
}
```

### Standard Response Headers
Every response from the gateway includes:
- `X-Request-Id`: Unique UUID v4 assigned to the request.
- `X-RateLimit-Remaining`: Number of tokens remaining in the caller's token bucket.
- `Retry-After`: (Included on HTTP `429` only) Number of seconds to wait before retrying.

---

## Error Codes Summary

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| `400` | `BAD_REQUEST` | Missing or invalid request payload / parameters |
| `401` | `UNAUTHORIZED` | Missing or invalid `Authorization: Bearer <token>` header |
| `401` | `INVALID_TOKEN` | JWT signature is invalid or token has expired |
| `403` | `FORBIDDEN` | Caller lacks the required role (e.g., non-admin calling `/admin/*`) |
| `404` | `ROUTE_NOT_FOUND` | Path does not match any registered gateway route |
| `404` | `USER_NOT_FOUND` | Specified user ID was not found in user service |
| `404` | `ORDER_NOT_FOUND` | Specified order ID was not found in order service |
| `404` | `PRODUCT_NOT_FOUND` | Specified product ID was not found in product service |
| `409` | `CONFLICT` | Entity already exists (e.g., email duplicate on registration) |
| `429` | `RATE_LIMIT_EXCEEDED` | Token bucket exhausted for caller's role |
| `500` | `INTERNAL_ERROR` | Uncaught gateway runtime error |
| `503` | `SERVICE_UNAVAILABLE` | No healthy backend instances available to service request |
| `504` | `REQUEST_TIMEOUT` | Backend did not respond within configured timeout (10,000ms) |

---

## 1. Public Endpoints

Public endpoints do not require an `Authorization` header.

### 1.1 `GET /health`
Returns the operational health status of the gateway process itself.

- **Authentication:** None
- **Request Body:** None
- **Response:** `200 OK`
```json
{
  "status": "ok",
  "service": "pulsegate-gateway"
}
```
- **Error Codes:** None

---

### 1.2 `POST /auth/register`
Creates a new user record in PostgreSQL and returns a signed JWT.

- **Authentication:** None
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "securepassword123"
}
```
- **Validation Rules:**
  - `name`: string, required
  - `email`: string, required, must contain `@`
  - `password`: string, required, minimum 8 characters
- **Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "a5e8f49b-7bb4-4c4f-8cf9-a6de15a132bc",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "role": "USER"
    }
  }
}
```
- **Error Codes:**
  - `400 BAD_REQUEST`: Missing required fields, invalid email format, or password < 8 characters.
  - `409 CONFLICT`: Email address already registered.

---

### 1.3 `POST /auth/login`
Authenticates user credentials against PostgreSQL and returns a signed JWT.

- **Authentication:** None
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "email": "jane@example.com",
  "password": "securepassword123"
}
```
- **Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "a5e8f49b-7bb4-4c4f-8cf9-a6de15a132bc",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "role": "USER"
    }
  }
}
```
- **Error Codes:**
  - `400 BAD_REQUEST`: Missing email or password.
  - `401 UNAUTHORIZED`: Invalid email or password combination.

---

## 2. Protected Endpoints (Require JWT)

All `/api/*` endpoints require a valid JWT passed via `Authorization: Bearer <token>`.

---

### 2.1 User Service Endpoints

#### `GET /api/users`
Retrieves all registered users from the user service.

- **Authentication:** `USER`, `PREMIUM`, or `ADMIN`
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:** None
- **Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "name": "Alice Johnson",
      "email": "alice@example.com",
      "role": "USER"
    },
    {
      "id": "2",
      "name": "Bob Smith",
      "email": "bob@example.com",
      "role": "PREMIUM"
    }
  ],
  "service": "user-service",
  "instance": "user-service-1"
}
```
- **Error Codes:** `401 UNAUTHORIZED`, `401 INVALID_TOKEN`, `429 RATE_LIMIT_EXCEEDED`, `503 SERVICE_UNAVAILABLE`, `504 REQUEST_TIMEOUT`.

---

#### `GET /api/users/:id`
Retrieves a single user by ID.

- **Authentication:** `USER`, `PREMIUM`, or `ADMIN`
- **Headers:** `Authorization: Bearer <token>`
- **Path Parameters:** `id` (string) - User identifier
- **Request Body:** None
- **Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "1",
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "role": "USER"
  },
  "service": "user-service",
  "instance": "user-service-2"
}
```
- **Error Codes:** `401 UNAUTHORIZED`, `401 INVALID_TOKEN`, `404 USER_NOT_FOUND`, `429 RATE_LIMIT_EXCEEDED`, `503 SERVICE_UNAVAILABLE`, `504 REQUEST_TIMEOUT`.

---

#### `POST /api/users`
Creates a new user record in the user service.

- **Authentication:** `USER`, `PREMIUM`, or `ADMIN`
- **Headers:**
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- **Request Body:**
```json
{
  "name": "Charlie Brown",
  "email": "charlie@example.com",
  "role": "USER"
}
```
- **Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "3",
    "name": "Charlie Brown",
    "email": "charlie@example.com",
    "role": "USER"
  },
  "service": "user-service",
  "instance": "user-service-3"
}
```
- **Error Codes:** `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `401 INVALID_TOKEN`, `429 RATE_LIMIT_EXCEEDED`, `503 SERVICE_UNAVAILABLE`, `504 REQUEST_TIMEOUT`.

---

### 2.2 Order Service Endpoints

#### `GET /api/orders`
Retrieves all orders from the order service.

- **Authentication:** `USER`, `PREMIUM`, or `ADMIN`
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:** None
- **Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "101",
      "userId": "1",
      "product": "Mechanical Keyboard",
      "quantity": 1,
      "totalPrice": 129.99,
      "status": "COMPLETED",
      "createdAt": "2026-08-30T10:00:00.000Z"
    }
  ],
  "service": "order-service",
  "instance": "order-service-1"
}
```
- **Error Codes:** `401 UNAUTHORIZED`, `401 INVALID_TOKEN`, `429 RATE_LIMIT_EXCEEDED`, `503 SERVICE_UNAVAILABLE`, `504 REQUEST_TIMEOUT`.

---

#### `GET /api/orders/:id`
Retrieves an order by its identifier.

- **Authentication:** `USER`, `PREMIUM`, or `ADMIN`
- **Headers:** `Authorization: Bearer <token>`
- **Path Parameters:** `id` (string) - Order identifier
- **Request Body:** None
- **Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "101",
    "userId": "1",
    "product": "Mechanical Keyboard",
    "quantity": 1,
    "totalPrice": 129.99,
    "status": "COMPLETED",
    "createdAt": "2026-08-30T10:00:00.000Z"
  },
  "service": "order-service",
  "instance": "order-service-2"
}
```
- **Error Codes:** `401 UNAUTHORIZED`, `401 INVALID_TOKEN`, `404 ORDER_NOT_FOUND`, `429 RATE_LIMIT_EXCEEDED`, `503 SERVICE_UNAVAILABLE`, `504 REQUEST_TIMEOUT`.

---

#### `POST /api/orders`
Places a new order in the order service.

- **Authentication:** `USER`, `PREMIUM`, or `ADMIN`
- **Headers:**
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- **Request Body:**
```json
{
  "userId": "1",
  "product": "4K Ultra-Wide Monitor",
  "quantity": 2,
  "totalPrice": 799.98
}
```
- **Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "102",
    "userId": "1",
    "product": "4K Ultra-Wide Monitor",
    "quantity": 2,
    "totalPrice": 799.98,
    "status": "PENDING",
    "createdAt": "2026-09-01T01:45:00.000Z"
  },
  "service": "order-service",
  "instance": "order-service-1"
}
```
- **Error Codes:** `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `401 INVALID_TOKEN`, `429 RATE_LIMIT_EXCEEDED`, `503 SERVICE_UNAVAILABLE`, `504 REQUEST_TIMEOUT`.

---

### 2.3 Product Service Endpoints

#### `GET /api/products`
Lists all available catalog products.

- **Authentication:** `USER`, `PREMIUM`, or `ADMIN`
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:** None
- **Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "prod-1",
      "name": "Wireless Mouse",
      "description": "Ergonomic 2.4GHz wireless mouse",
      "price": 49.99,
      "category": "Electronics"
    },
    {
      "id": "prod-2",
      "name": "USB-C Hub",
      "description": "7-in-1 multi-port adapter",
      "price": 34.50,
      "category": "Accessories"
    }
  ],
  "service": "product-service",
  "instance": "product-service-1"
}
```
- **Error Codes:** `401 UNAUTHORIZED`, `401 INVALID_TOKEN`, `429 RATE_LIMIT_EXCEEDED`, `503 SERVICE_UNAVAILABLE`, `504 REQUEST_TIMEOUT`.

---

#### `GET /api/products/:id`
Retrieves product details by product ID.

- **Authentication:** `USER`, `PREMIUM`, or `ADMIN`
- **Headers:** `Authorization: Bearer <token>`
- **Path Parameters:** `id` (string) - Product identifier
- **Request Body:** None
- **Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "prod-1",
    "name": "Wireless Mouse",
    "description": "Ergonomic 2.4GHz wireless mouse",
    "price": 49.99,
    "category": "Electronics"
  },
  "service": "product-service",
  "instance": "product-service-2"
}
```
- **Error Codes:** `401 UNAUTHORIZED`, `401 INVALID_TOKEN`, `404 PRODUCT_NOT_FOUND`, `429 RATE_LIMIT_EXCEEDED`, `503 SERVICE_UNAVAILABLE`, `504 REQUEST_TIMEOUT`.

---

#### `POST /api/products`
Adds a new product to the catalog.

- **Authentication:** `USER`, `PREMIUM`, or `ADMIN`
- **Headers:**
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- **Request Body:**
```json
{
  "name": "Noise Cancelling Headphones",
  "description": "Over-ear active noise cancelling Bluetooth headphones",
  "price": 199.99,
  "category": "Audio"
}
```
- **Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "prod-3",
    "name": "Noise Cancelling Headphones",
    "description": "Over-ear active noise cancelling Bluetooth headphones",
    "price": 199.99,
    "category": "Audio"
  },
  "service": "product-service",
  "instance": "product-service-1"
}
```
- **Error Codes:** `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `401 INVALID_TOKEN`, `429 RATE_LIMIT_EXCEEDED`, `503 SERVICE_UNAVAILABLE`, `504 REQUEST_TIMEOUT`.

---

## 3. Admin Endpoints (Require `ADMIN` Role)

Admin endpoints require a valid JWT where the claims payload includes `"role": "ADMIN"`.

---

### 3.1 `GET /admin/services`
Returns the status, host, port, failure counts, and health flags of all registered backend instances.

- **Authentication:** `ADMIN` role required
- **Headers:** `Authorization: Bearer <admin-token>`
- **Request Body:** None
- **Response:** `200 OK`
```json
[
  {
    "id": "user-service-1",
    "service": "user-service",
    "host": "user-service-1",
    "port": 4001,
    "healthy": true,
    "lastChecked": "2026-09-01T01:45:10.000Z",
    "failureCount": 0,
    "recoveryCount": 12
  },
  {
    "id": "user-service-2",
    "service": "user-service",
    "host": "user-service-2",
    "port": 4002,
    "healthy": true,
    "lastChecked": "2026-09-01T01:45:10.000Z",
    "failureCount": 0,
    "recoveryCount": 12
  },
  {
    "id": "user-service-3",
    "service": "user-service",
    "host": "user-service-3",
    "port": 4003,
    "healthy": true,
    "lastChecked": "2026-09-01T01:45:10.000Z",
    "failureCount": 0,
    "recoveryCount": 12
  },
  {
    "id": "order-service-1",
    "service": "order-service",
    "host": "order-service-1",
    "port": 4011,
    "healthy": true,
    "lastChecked": "2026-09-01T01:45:10.000Z",
    "failureCount": 0,
    "recoveryCount": 12
  },
  {
    "id": "order-service-2",
    "service": "order-service",
    "host": "order-service-2",
    "port": 4012,
    "healthy": true,
    "lastChecked": "2026-09-01T01:45:10.000Z",
    "failureCount": 0,
    "recoveryCount": 12
  },
  {
    "id": "product-service-1",
    "service": "product-service",
    "host": "product-service-1",
    "port": 4021,
    "healthy": true,
    "lastChecked": "2026-09-01T01:45:10.000Z",
    "failureCount": 0,
    "recoveryCount": 12
  },
  {
    "id": "product-service-2",
    "service": "product-service",
    "host": "product-service-2",
    "port": 4022,
    "healthy": true,
    "lastChecked": "2026-09-01T01:45:10.000Z",
    "failureCount": 0,
    "recoveryCount": 12
  }
]
```
- **Error Codes:** `401 UNAUTHORIZED`, `401 INVALID_TOKEN`, `403 FORBIDDEN`.

---

### 3.2 `GET /admin/routes`
Returns the active routing table mapping URL path prefixes to target microservices and path stripping rules.

- **Authentication:** `ADMIN` role required
- **Headers:** `Authorization: Bearer <admin-token>`
- **Request Body:** None
- **Response:** `200 OK`
```json
{
  "/api/users": {
    "service": "user-service",
    "strip": "/api"
  },
  "/api/orders": {
    "service": "order-service",
    "strip": "/api"
  },
  "/api/products": {
    "service": "product-service",
    "strip": "/api"
  }
}
```
- **Error Codes:** `401 UNAUTHORIZED`, `401 INVALID_TOKEN`, `403 FORBIDDEN`.

---

### 3.3 `GET /admin/metrics`
Returns aggregate performance telemetry, error counters, latency percentiles, and traffic distribution.

- **Authentication:** `ADMIN` role required
- **Headers:** `Authorization: Bearer <admin-token>`
- **Request Body:** None
- **Response:** `200 OK`
```json
{
  "totalRequests": 1542,
  "successfulRequests": 1510,
  "clientErrors": 28,
  "serverErrors": 4,
  "rateLimitedRequests": 15,
  "requestCountByRoute": {
    "/api/users": 820,
    "/api/orders": 412,
    "/api/products": 310
  },
  "requestCountByBackend": {
    "user-service": 820,
    "order-service": 412,
    "product-service": 310
  },
  "backendFailures": {
    "user-service-2": 4
  },
  "p50": 12,
  "p95": 48,
  "p99": 115
}
```
- **Error Codes:** `401 UNAUTHORIZED`, `401 INVALID_TOKEN`, `403 FORBIDDEN`.

---

### 3.4 `GET /admin/requests`
Returns the circular buffer of the 500 most recent requests handled by the gateway.

- **Authentication:** `ADMIN` role required
- **Headers:** `Authorization: Bearer <admin-token>`
- **Request Body:** None
- **Response:** `200 OK`
```json
[
  {
    "timestamp": "2026-09-01T01:45:30.120Z",
    "requestId": "9a0d81ef-2eb9-4081-99e2-2a7f05bd4fa6",
    "method": "GET",
    "path": "/api/users",
    "status": 200,
    "latencyMs": 14,
    "service": "user-service",
    "instance": "user-service-1"
  },
  {
    "timestamp": "2026-09-01T01:45:31.050Z",
    "requestId": "0f63bce2-68c9-4b08-8e6f-77984f18d7aa",
    "method": "POST",
    "path": "/api/orders",
    "status": 201,
    "latencyMs": 28,
    "service": "order-service",
    "instance": "order-service-2"
  }
]
```
- **Error Codes:** `401 UNAUTHORIZED`, `401 INVALID_TOKEN`, `403 FORBIDDEN`.
