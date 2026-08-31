import { Request, Response } from 'express';
import { getAllOrders, getOrderById, createOrder } from '../services/orderService';
import { ServiceResponse, ErrorResponse, Order } from '../types';

const SERVICE_NAME = 'order-service';
const INSTANCE_ID = process.env.INSTANCE_ID ?? 'order-service-unknown';

export function listOrders(_req: Request, res: Response): void {
  const orders = getAllOrders();
  const response: ServiceResponse<Order[]> = {
    success: true,
    data: orders,
    service: SERVICE_NAME,
    instance: INSTANCE_ID,
  };
  res.json(response);
}

export function getOrder(req: Request, res: Response): void {
  const order = getOrderById(req.params.id);

  if (!order) {
    const error: ErrorResponse = {
      success: false,
      error: {
        code: 'ORDER_NOT_FOUND',
        message: `Order with id '${req.params.id}' not found`,
      },
      service: SERVICE_NAME,
      instance: INSTANCE_ID,
    };
    res.status(404).json(error);
    return;
  }

  const response: ServiceResponse<Order> = {
    success: true,
    data: order,
    service: SERVICE_NAME,
    instance: INSTANCE_ID,
  };
  res.json(response);
}

export function addOrder(req: Request, res: Response): void {
  const { userId, product, quantity, totalPrice } = req.body;

  if (!userId || !product || !quantity || !totalPrice) {
    const error: ErrorResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'userId, product, quantity, and totalPrice are required',
      },
      service: SERVICE_NAME,
      instance: INSTANCE_ID,
    };
    res.status(400).json(error);
    return;
  }

  const order = createOrder({ userId, product, quantity, totalPrice });
  const response: ServiceResponse<Order> = {
    success: true,
    data: order,
    service: SERVICE_NAME,
    instance: INSTANCE_ID,
  };
  res.status(201).json(response);
}
