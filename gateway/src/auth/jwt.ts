import jwt from 'jsonwebtoken';
import { config } from '../config/settings';
import { JwtPayload } from '../types';

/**
 * Sign a JWT token with the configured secret.
 * Expires in 24 hours.
 */
export function signToken(payload: { userId: string; role: string }): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '24h' });
}

/**
 * Verify a JWT token and return the decoded payload.
 * Throws if the token is invalid or expired.
 */
export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, config.jwtSecret);

  if (typeof decoded === 'string' || !decoded) {
    throw new Error('Invalid token payload');
  }

  const payload = decoded as Record<string, unknown>;

  if (typeof payload.userId !== 'string' || typeof payload.role !== 'string') {
    throw new Error('Token missing required fields');
  }

  return {
    userId: payload.userId,
    role: payload.role as JwtPayload['role'],
  };
}
