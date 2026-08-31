import { Router, Request, Response } from 'express';
import { HealthResponse } from '../types';

const router = Router();

const SERVICE_NAME = 'order-service';
const INSTANCE_ID = process.env.INSTANCE_ID ?? 'order-service-unknown';
const startTime = Date.now();

router.get('/', (_req: Request, res: Response) => {
  const response: HealthResponse = {
    status: 'ok',
    service: SERVICE_NAME,
    instance: INSTANCE_ID,
    uptime: Math.floor((Date.now() - startTime) / 1000),
  };
  res.json(response);
});

export default router;
