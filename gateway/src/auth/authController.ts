import { Request, Response, NextFunction } from 'express';
import { registerUser, loginUser } from './authService';
import { signToken } from './jwt';
import { badRequest } from '../errors/gatewayError';
import { logger } from '../logging/logger';

// Basic email format validation (no external deps)
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * POST /auth/register
 *
 * Creates a new user account and returns a JWT.
 * Validates name, email (format), and password (min 8 chars).
 */
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, email, password } = req.body as Record<string, unknown>;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return next(badRequest('Name is required').withRequestId(req.requestId));
    }
    if (!email || typeof email !== 'string' || !isValidEmail(email)) {
      return next(badRequest('A valid email address is required').withRequestId(req.requestId));
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return next(badRequest('Password must be at least 8 characters').withRequestId(req.requestId));
    }

    const user = await registerUser(name.trim(), email.toLowerCase().trim(), password);
    const token = signToken({ userId: user.id, role: user.role });

    logger.info('User registered', { userId: user.id, role: user.role });

    res.status(201).json({
      success: true,
      data: {
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      },
    });
  } catch (err: unknown) {
    // PostgreSQL unique violation code
    if (
      err instanceof Error &&
      'code' in err &&
      (err as NodeJS.ErrnoException & { code: string }).code === '23505'
    ) {
      res.status(409).json({
        success: false,
        error: { code: 'EMAIL_ALREADY_EXISTS', message: 'Email is already registered' },
        requestId: req.requestId,
      });
      return;
    }
    next(err);
  }
}

/**
 * POST /auth/login
 *
 * Authenticates a user and returns a JWT.
 */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body as Record<string, unknown>;

    if (!email || typeof email !== 'string') {
      return next(badRequest('Email is required').withRequestId(req.requestId));
    }
    if (!password || typeof password !== 'string') {
      return next(badRequest('Password is required').withRequestId(req.requestId));
    }

    const user = await loginUser(email.toLowerCase().trim(), password);

    if (!user) {
      res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
        requestId: req.requestId,
      });
      return;
    }

    const token = signToken({ userId: user.id, role: user.role });

    logger.info('User logged in', { userId: user.id, role: user.role });

    res.status(200).json({
      success: true,
      data: {
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      },
    });
  } catch (err) {
    next(err);
  }
}
