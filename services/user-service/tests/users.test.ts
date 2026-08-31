import request from 'supertest';
import app from '../src/app';

describe('User Service - Users API', () => {
  it('GET /users should return a list of users', async () => {
    const res = await request(app).get('/users');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.service).toBe('user-service');
  });

  it('GET /users/:id should return a single user', async () => {
    const res = await request(app).get('/users/1');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('1');
  });

  it('GET /users/:id should return 404 for unknown user', async () => {
    const res = await request(app).get('/users/999');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('USER_NOT_FOUND');
  });

  it('POST /users should create a new user', async () => {
    const res = await request(app)
      .post('/users')
      .send({ name: 'Test User', email: 'test@example.com' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Test User');
    expect(res.body.data.email).toBe('test@example.com');
    expect(res.body.data.role).toBe('USER');
  });

  it('POST /users should return 400 if name is missing', async () => {
    const res = await request(app)
      .post('/users')
      .send({ email: 'test@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
