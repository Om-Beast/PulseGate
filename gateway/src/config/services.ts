export interface InstanceConfig {
  id: string;
  host: string;
  port: number;
  protocol?: 'http' | 'https';
}

function env(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function envPort(key: string, fallback: number): number {
  const value = Number(process.env[key]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function envProtocol(key: string, fallback: 'http' | 'https'): 'http' | 'https' {
  const value = process.env[key];
  return value === 'https' ? 'https' : fallback;
}

export const SERVICES_CONFIG: Record<string, InstanceConfig[]> = {
  'user-service': [
    {
      id: 'user-service-1',
      host: env('USER_SERVICE_1_HOST', 'user-service-1'),
      port: envPort('USER_SERVICE_1_PORT', 4001),
      protocol: envProtocol('USER_SERVICE_1_PROTOCOL', 'http'),
    },
    {
      id: 'user-service-2',
      host: env('USER_SERVICE_2_HOST', 'user-service-2'),
      port: envPort('USER_SERVICE_2_PORT', 4002),
      protocol: envProtocol('USER_SERVICE_2_PROTOCOL', 'http'),
    },
    {
      id: 'user-service-3',
      host: env('USER_SERVICE_3_HOST', 'user-service-3'),
      port: envPort('USER_SERVICE_3_PORT', 4003),
      protocol: envProtocol('USER_SERVICE_3_PROTOCOL', 'http'),
    },
  ],

  'order-service': [
    {
      id: 'order-service-1',
      host: env('ORDER_SERVICE_1_HOST', 'order-service-1'),
      port: envPort('ORDER_SERVICE_1_PORT', 4011),
      protocol: envProtocol('ORDER_SERVICE_1_PROTOCOL', 'http'),
    },
    {
      id: 'order-service-2',
      host: env('ORDER_SERVICE_2_HOST', 'order-service-2'),
      port: envPort('ORDER_SERVICE_2_PORT', 4012),
      protocol: envProtocol('ORDER_SERVICE_2_PROTOCOL', 'http'),
    },
  ],

  'product-service': [
    {
      id: 'product-service-1',
      host: env('PRODUCT_SERVICE_1_HOST', 'product-service-1'),
      port: envPort('PRODUCT_SERVICE_1_PORT', 4021),
      protocol: envProtocol('PRODUCT_SERVICE_1_PROTOCOL', 'http'),
    },
    {
      id: 'product-service-2',
      host: env('PRODUCT_SERVICE_2_HOST', 'product-service-2'),
      port: envPort('PRODUCT_SERVICE_2_PORT', 4022),
      protocol: envProtocol('PRODUCT_SERVICE_2_PROTOCOL', 'http'),
    },
  ],
};
