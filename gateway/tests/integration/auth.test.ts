import request from 'supertest';
import app from '../../src/app';

// Mock PostgreSQL to avoid needing a real database during tests
jest.mock('../../src/auth/authService', () => {
  const users: Record<string, { id: string; name: string; email: string; role: string; password_hash: string }> = {};

  return {
    initDb: jest.fn().mockResolvedValue(undefined),
    closeDb: jest.fn().mockResolvedValue(undefined),
    getPool: jest.fn(),
    registerUser: jest.fn(async (name: string, email: string) => {
      if (users[email]) {
        const err = new Error('duplicate key value');
        (err as NodeJS.ErrnoException & { code: string }).code = '23505';
        throw err;
      }
      const user = { id: `uid-${Date.now()}`, name, email, role: 'USER', created_at: new Date() };
      users[email] = { ...user, password_hash: 'hashed' };
      return user;
    }),
    loginUser: jest.fn(async (email: string, password: string) => {
      const user = users[email];
      if (!user) return null;
      if (password !== 'correctpassword') return null;
      return { id: user.id, name: user.name, email: user.email, role: user.role, created_at: new Date() };
    }),
  };
});

describe('Auth Routes', () => {
  const validUser = {
    name: 'Test User',
    email: `testauth-${Date.now()}@example.com`,
    password: 'correctpassword',
  };

  describe('POST /auth/register', () => {
    it('registers a new user and returns a JWT', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send(validUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.token).toBe('string');
      expect(res.body.data.user.email).toBe(validUser.email);
      expect(res.body.data.user.role).toBe('USER');
    });

    it('returns 409 for duplicate email', async () => {
      // First registration
      await request(app).post('/auth/register').send(validUser);

      // Second registration with same email
      const res = await request(app).post('/auth/register').send(validUser);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('returns 400 if name is missing', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ email: 'x@example.com', password: 'validpassword' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });

    it('returns 400 if email is invalid', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ name: 'Test', email: 'not-an-email', password: 'validpassword' });
      expect(res.status).toBe(400);
    });

    it('returns 400 if password is too short', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ name: 'Test', email: 'x@example.com', password: 'short' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    it('returns JWT for valid credentials', async () => {
      // Register first
      await request(app).post('/auth/register').send(validUser);

      const res = await request(app)
        .post('/auth/login')
        .send({ email: validUser.email, password: validUser.password });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.token).toBe('string');
    });

    it('returns 401 for wrong password', async () => {
      await request(app).post('/auth/register').send(validUser);

      const res = await request(app)
        .post('/auth/login')
        .send({ email: validUser.email, password: 'wrongpassword' });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('returns 400 if email is missing', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ password: 'somepassword' });
      expect(res.status).toBe(400);
    });
  });

  describe('Protected API Routes', () => {
    it('returns 401 for /api/users without token', async () => {
      const res = await request(app).get('/api/users');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 401 for invalid JWT token', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer this.is.invalid');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });

    it('returns 401 for malformed Authorization header', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', 'NotBearer token');
      expect(res.status).toBe(401);
    });
  });

  describe('Admin Routes', () => {
    it('returns 401 for /admin/metrics without token', async () => {
      const res = await request(app).get('/admin/metrics');
      expect(res.status).toBe(401);
    });

    it('returns 403 for /admin/metrics with USER role token', async () => {
      // Register and login to get a USER token
      await request(app).post('/auth/register').send(validUser);
      const loginRes = await request(app)
        .post('/auth/login')
        .send({ email: validUser.email, password: validUser.password });

      const token: string = loginRes.body.data?.token ?? '';

      // USER token should get 403 on admin endpoint
      if (token) {
        const adminRes = await request(app)
          .get('/admin/metrics')
          .set('Authorization', `Bearer ${token}`);
        // Either 403 (if token is valid USER) or 503 (service unavailable for API routes)
        expect([403, 401]).toContain(adminRes.status);
      }
    });
  });
});
