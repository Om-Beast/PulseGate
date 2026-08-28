# PulseGate

> Production-Style API Gateway & Traffic Manager

PulseGate is a production-minded API gateway built to demonstrate practical backend engineering concepts including request routing, distributed rate limiting, load balancing, backend health checks, authentication, observability, testing, and containerized deployment.

## Core Features

- API Gateway / Reverse Proxy
- Request Routing
- JWT Authentication
- Redis-backed Token Bucket Rate Limiting
- Round-Robin Load Balancing
- Backend Health Checks
- Automatic Unhealthy Instance Removal
- Request Metrics
- Structured Logging
- Request Correlation IDs
- Dockerized Local Environment
- Unit and Integration Tests
- k6 Load Testing
- Operational Dashboard

## Technology Stack

- Node.js
- TypeScript
- Express
- Redis
- PostgreSQL
- React
- Vite
- Tailwind CSS
- Jest
- Supertest
- k6
- Docker

## Project Structure

```text
gateway/        API Gateway
services/       Backend services
dashboard/      Operational dashboard
load-tests/     Performance tests
infra/          Infrastructure configuration
docs/           Architecture and API documentation