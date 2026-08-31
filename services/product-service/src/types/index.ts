export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  inStock: boolean;
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
