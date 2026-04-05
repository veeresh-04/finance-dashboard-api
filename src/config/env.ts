import dotenv from 'dotenv';
dotenv.config();

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const PORT = parseInt(process.env.PORT ?? '3000', 10);
export const NODE_ENV = process.env.NODE_ENV ?? 'development';
export const JWT_SECRET = requireEnv('JWT_SECRET', 'dev-secret-key');
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '7d';
export const DB_PATH = process.env.DB_PATH ?? './data/finance.db';
export const IS_TEST = NODE_ENV === 'test';