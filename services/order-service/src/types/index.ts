export interface Order {
  id: string;
  userId: string;
  product: string;
  quantity: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered';
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
