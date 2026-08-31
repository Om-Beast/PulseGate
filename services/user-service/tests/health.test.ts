import request from 'supertest';
import app from '../src/app';

describe('User Service - Health Check', () => {
  it('GET /health should return 200 with status ok', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('user-service');
    expect(res.body).toHaveProperty('instance');
    expect(res.body).toHaveProperty('uptime');
  });
});
