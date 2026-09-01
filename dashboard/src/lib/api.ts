import type {
  ServiceInstance,
  GatewayMetrics,
  RecentRequest,
  RouteConfig,
  SystemHealth,
} from '../types';

// ─── Token Storage ─────────────────────────────────────────────────────────────

export function getToken(): string | null {
  return sessionStorage.getItem('pg_token');
}

export function setToken(token: string): void {
  sessionStorage.setItem('pg_token', token);
}

export function clearToken(): void {
  sessionStorage.removeItem('pg_token');
  sessionStorage.removeItem('pg_user');
}

export function getStoredUser(): StoredUser | null {
  const raw = sessionStorage.getItem('pg_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export function setStoredUser(user: StoredUser): void {
  sessionStorage.setItem('pg_user', JSON.stringify(user));
}

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

// ─── API Error ─────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ─── Base Fetcher ──────────────────────────────────────────────────────────────

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: { code: string; message: string };
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401 || response.status === 403) {
    // Token expired or forbidden — clear session
    clearToken();
    throw new ApiError(response.status, response.status === 401 ? 'Unauthorized' : 'Forbidden');
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null) as ApiResponse<unknown> | null;
    const msg = body?.error?.message ?? `HTTP ${response.status}`;
    throw new ApiError(response.status, msg);
  }

  const json = (await response.json()) as ApiResponse<T>;
  return json.data;
}

// ─── Auth ──────────────────────────────────────────────────────────────────────

export async function login(
  email: string,
  password: string,
): Promise<{ token: string; user: StoredUser }> {
  const response = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    if (response.status === 401) throw new ApiError(401, 'Invalid email or password');
    throw new ApiError(response.status, 'Login failed');
  }

  const json = await response.json() as ApiResponse<{ token: string; user: StoredUser }>;
  return json.data;
}

// ─── Admin APIs ─────────────────────────────────────────────────────────────────

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

export async function fetchSystemHealth(): Promise<SystemHealth> {
  return fetchJson<SystemHealth>('/admin/health');
}
