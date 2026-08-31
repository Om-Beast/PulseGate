import { Order } from '../types';

const orders: Order[] = [
  {
    id: '1',
    userId: '1',
    product: 'Mechanical Keyboard',
    quantity: 1,
    totalPrice: 8999,
    status: 'delivered',
    createdAt: '2026-06-01T12:00:00Z',
  },
  {
    id: '2',
    userId: '2',
    product: 'Wireless Mouse',
    quantity: 2,
    totalPrice: 3498,
    status: 'shipped',
    createdAt: '2026-07-15T09:30:00Z',
  },
  {
    id: '3',
    userId: '1',
    product: 'USB-C Hub',
    quantity: 1,
    totalPrice: 4599,
    status: 'pending',
    createdAt: '2026-08-20T16:45:00Z',
  },
];

let nextId = 4;

export function getAllOrders(): Order[] {
  return orders;
}

export function getOrderById(id: string): Order | undefined {
  return orders.find((order) => order.id === id);
}

export function createOrder(data: {
  userId: string;
  product: string;
  quantity: number;
  totalPrice: number;
}): Order {
  const order: Order = {
    id: String(nextId++),
    userId: data.userId,
    product: data.product,
    quantity: data.quantity,
    totalPrice: data.totalPrice,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  orders.push(order);
  return order;
}
