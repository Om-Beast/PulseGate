import type { ServiceInstance, GatewayMetrics, RecentRequest, RouteConfig } from '../types';

// The gateway wraps all admin responses in { success: true, data: ... }
interface ApiResponse<T> {
  success: boolean;
  data: T;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  const json = (await response.json()) as ApiResponse<T>;
  return json.data;
}

export async function fetchServices(): Promise<ServiceInstance[]> {
  return fetchJson<ServiceInstance[]>('/admin/services');
}

export async function fetchRoutes(): Promise<Record<string, RouteConfig>> {
  return fetchJson<Record<string, RouteConfig>>('/admin/routes');
}

export async function fetchMetrics(): Promise<GatewayMetrics> {
  return fetchJson<GatewayMetrics>('/admin/metrics');
}

export async function fetchRequests(): Promise<RecentRequest[]> {
  return fetchJson<RecentRequest[]>('/admin/requests');
}

export async function login(
  email: string,
  password: string,
): Promise<{ token: string; user: { id: string; name: string; email: string; role: string } }> {
  const response = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    throw new Error('Login failed');
  }
  const json = await response.json() as ApiResponse<{ token: string; user: { id: string; name: string; email: string; role: string } }>;
  return json.data;
}

export async function register(
  name: string,
  email: string,
  password: string,
): Promise<{ token: string; user: { id: string; name: string; email: string; role: string } }> {
  const response = await fetch('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  if (!response.ok) {
    throw new Error('Registration failed');
  }
  const json = await response.json() as ApiResponse<{ token: string; user: { id: string; name: string; email: string; role: string } }>;
  return json.data;
}
