export interface User {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN' | 'PREMIUM';
  createdAt: string;
}

export interface ServiceResponse<T> {
  success: boolean;
  data: T;
  service: string;
  instance: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
  service: string;
  instance: string;
}

export interface HealthResponse {
  status: 'ok';
  service: string;
  instance: string;
  uptime: number;
}
