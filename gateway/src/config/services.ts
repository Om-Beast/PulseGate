// ─── Backend Services Configuration ───────────────────────────────────────────
// Defines all backend instances. In Docker Compose, hostnames match service names.
// The gateway uses these to seed the BackendRegistry on startup.

export interface InstanceConfig {
  id: string;
  host: string;
  port: number;
}

export const SERVICES_CONFIG: Record<string, InstanceConfig[]> = {
  'user-service': [
    { id: 'user-service-1', host: 'user-service-1', port: 4001 },
    { id: 'user-service-2', host: 'user-service-2', port: 4002 },
    { id: 'user-service-3', host: 'user-service-3', port: 4003 },
  ],
  'order-service': [
    { id: 'order-service-1', host: 'order-service-1', port: 4011 },
    { id: 'order-service-2', host: 'order-service-2', port: 4012 },
  ],
  'product-service': [
    { id: 'product-service-1', host: 'product-service-1', port: 4021 },
    { id: 'product-service-2', host: 'product-service-2', port: 4022 },
  ],
};
