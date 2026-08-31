type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogFields = Record<string, unknown>;

function log(level: LogLevel, message: string, fields?: LogFields): void {
  // Never log sensitive fields
  const safeFields = fields ? sanitize(fields) : {};

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...safeFields,
  };

  if (level === 'error') {
    process.stderr.write(JSON.stringify(entry) + '\n');
  } else {
    process.stdout.write(JSON.stringify(entry) + '\n');
  }
}

const SENSITIVE_KEYS = new Set([
  'password',
  'password_hash',
  'passwordHash',
  'secret',
  'jwtSecret',
  'token',
  'authorization',
  'Authorization',
  'cookie',
  'Cookie',
]);

function sanitize(fields: LogFields): LogFields {
  const result: LogFields = {};
  for (const [key, value] of Object.entries(fields)) {
    if (SENSITIVE_KEYS.has(key)) {
      result[key] = '[REDACTED]';
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = sanitize(value as LogFields);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export const logger = {
  debug(message: string, fields?: LogFields): void {
    log('debug', message, fields);
  },

  info(message: string, fields?: LogFields): void {
    log('info', message, fields);
  },

  warn(message: string, fields?: LogFields): void {
    log('warn', message, fields);
  },

  error(message: string, fields?: LogFields): void {
    log('error', message, fields);
  },
};
