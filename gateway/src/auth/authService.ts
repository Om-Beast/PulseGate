import { Pool } from 'pg';
import { config } from '../config/settings';
import { logger } from '../logging/logger';
import { hashPassword, comparePassword } from './password';

// ─── Database Pool ─────────────────────────────────────────────────────────────

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: config.postgres.host,
      port: config.postgres.port,
      database: config.postgres.database,
      user: config.postgres.user,
      password: config.postgres.password,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      logger.error('PostgreSQL pool error', { message: err.message });
    });
  }
  return pool;
}

// ─── Schema Initialization ─────────────────────────────────────────────────────

export async function initDb(): Promise<void> {
  const db = getPool();

  await db.query(`
    CREATE TABLE IF NOT EXISTS auth_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'USER',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  logger.info('Database schema initialized');
}

// ─── Auth Operations ───────────────────────────────────────────────────────────

export interface AuthUserRecord {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN' | 'PREMIUM';
  created_at: Date;
}

/**
 * Register a new user. Hashes the password before storing.
 * Throws if email already exists.
 */
export async function registerUser(
  name: string,
  email: string,
  password: string,
): Promise<AuthUserRecord> {
  const db = getPool();
  const passwordHash = await hashPassword(password);

  const result = await db.query<AuthUserRecord>(
    `INSERT INTO auth_users (name, email, password_hash, role)
     VALUES ($1, $2, $3, 'USER')
     RETURNING id, name, email, role, created_at`,
    [name, email, passwordHash],
  );

  return result.rows[0];
}

/**
 * Authenticate a user by email and password.
 * Returns the user record if credentials are valid, null otherwise.
 */
export async function loginUser(
  email: string,
  password: string,
): Promise<AuthUserRecord | null> {
  const db = getPool();

  const result = await db.query<AuthUserRecord & { password_hash: string }>(
    `SELECT id, name, email, role, created_at, password_hash
     FROM auth_users
     WHERE email = $1`,
    [email],
  );

  if (result.rows.length === 0) return null;

  const user = result.rows[0];
  const valid = await comparePassword(password, user.password_hash);

  if (!valid) return null;

  // Return user without password hash
  const { password_hash, ...safeUser } = user;
  return safeUser as AuthUserRecord;
}

/**
 * Close the database pool. Called during graceful shutdown.
 */
export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Database pool closed');
  }
}
