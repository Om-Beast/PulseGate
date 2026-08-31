import request from 'supertest';
import app from '../src/app';

describe('Order Service - Orders API', () => {
  it('GET /orders should return a list of orders', async () => {
    const res = await request(app).get('/orders');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.service).toBe('order-service');
  });

  it('GET /orders/:id should return a single order', async () => {
    const res = await request(app).get('/orders/1');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('1');
  });

  it('GET /orders/:id should return 404 for unknown order', async () => {
    const res = await request(app).get('/orders/999');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('ORDER_NOT_FOUND');
  });

  it('POST /orders should create a new order', async () => {
    const res = await request(app)
      .post('/orders')
      .send({ userId: '1', product: 'Monitor', quantity: 1, totalPrice: 25000 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.product).toBe('Monitor');
    expect(res.body.data.status).toBe('pending');
  });

  it('POST /orders should return 400 if required fields are missing', async () => {
    const res = await request(app)
      .post('/orders')
      .send({ userId: '1' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
