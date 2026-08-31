import request from 'supertest';
import app from '../src/app';

describe('Product Service - Products API', () => {
  it('GET /products should return a list of products', async () => {
    const res = await request(app).get('/products');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.service).toBe('product-service');
  });

  it('GET /products/:id should return a single product', async () => {
    const res = await request(app).get('/products/1');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('1');
  });

  it('GET /products/:id should return 404 for unknown product', async () => {
    const res = await request(app).get('/products/999');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('PRODUCT_NOT_FOUND');
  });

  it('POST /products should create a new product', async () => {
    const res = await request(app)
      .post('/products')
      .send({ name: 'Test Headphones', description: 'Over-ear headphones', price: 5999, category: 'audio' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Test Headphones');
    expect(res.body.data.inStock).toBe(true);
  });

  it('POST /products should return 400 if required fields are missing', async () => {
    const res = await request(app)
      .post('/products')
      .send({ name: 'Incomplete Product' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
