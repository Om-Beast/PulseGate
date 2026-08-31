import { Request, Response } from 'express';
import { getAllProducts, getProductById, createProduct } from '../services/productService';
import { ServiceResponse, ErrorResponse, Product } from '../types';

const SERVICE_NAME = 'product-service';
const INSTANCE_ID = process.env.INSTANCE_ID ?? 'product-service-unknown';

export function listProducts(_req: Request, res: Response): void {
  const products = getAllProducts();
  const response: ServiceResponse<Product[]> = {
    success: true,
    data: products,
    service: SERVICE_NAME,
    instance: INSTANCE_ID,
  };
  res.json(response);
}

export function getProduct(req: Request, res: Response): void {
  const product = getProductById(req.params.id);

  if (!product) {
    const error: ErrorResponse = {
      success: false,
      error: {
        code: 'PRODUCT_NOT_FOUND',
        message: `Product with id '${req.params.id}' not found`,
      },
      service: SERVICE_NAME,
      instance: INSTANCE_ID,
    };
    res.status(404).json(error);
    return;
  }

  const response: ServiceResponse<Product> = {
    success: true,
    data: product,
    service: SERVICE_NAME,
    instance: INSTANCE_ID,
  };
  res.json(response);
}

export function addProduct(req: Request, res: Response): void {
  const { name, description, price, category } = req.body;

  if (!name || !description || !price || !category) {
    const error: ErrorResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'name, description, price, and category are required',
      },
      service: SERVICE_NAME,
      instance: INSTANCE_ID,
    };
    res.status(400).json(error);
    return;
  }

  const product = createProduct({ name, description, price, category });
  const response: ServiceResponse<Product> = {
    success: true,
    data: product,
    service: SERVICE_NAME,
    instance: INSTANCE_ID,
  };
  res.status(201).json(response);
}
