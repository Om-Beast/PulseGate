import request from 'supertest';
import express from 'express';
import { correlationId } from '../../src/middleware/correlationId';

const testApp = express();
testApp.use(correlationId);
testApp.get('/test', (req, res) => {
  res.json({ requestId: req.requestId });
});

describe('correlationId middleware', () => {
  it('generates a UUID if X-Request-Id header is missing', async () => {
    const res = await request(testApp).get('/test');
    expect(res.status).toBe(200);
    expect(res.body.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('preserves an existing X-Request-Id header', async () => {
    const existingId = 'my-custom-request-id-12345';
    const res = await request(testApp).get('/test').set('X-Request-Id', existingId);
    expect(res.status).toBe(200);
    expect(res.body.requestId).toBe(existingId);
  });

  it('returns X-Request-Id in the response header', async () => {
    const res = await request(testApp).get('/test');
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('returns the same X-Request-Id as provided in the request', async () => {
    const myId = 'trace-xyz-999';
    const res = await request(testApp).get('/test').set('X-Request-Id', myId);
    expect(res.headers['x-request-id']).toBe(myId);
  });

  it('attaches requestId to req object', async () => {
    const res = await request(testApp).get('/test');
    expect(typeof res.body.requestId).toBe('string');
    expect(res.body.requestId.length).toBeGreaterThan(0);
  });
});
