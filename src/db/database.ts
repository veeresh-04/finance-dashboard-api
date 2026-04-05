import { Pool } from 'pg';
import { DATABASE_URL, NODE_ENV } from '../config/env';

type DbClient = Pick<Pool, 'query' | 'end'>;

let db: DbClient | undefined;

export function getDb(): DbClient {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }

  return db;
}

function isDbClient(value: unknown): value is DbClient {
  return typeof value === 'object'
    && value !== null
    && typeof (value as DbClient).query === 'function'
    && typeof (value as DbClient).end === 'function';
}

export async function initDb(poolOrConnectionString?: DbClient | string): Promise<DbClient> {
  if (isDbClient(poolOrConnectionString)) {
    db = poolOrConnectionString;
  } else {
    db = new Pool({
      connectionString: poolOrConnectionString ?? DATABASE_URL,
      ssl: NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
  }

  await db.query('SELECT 1');
  await runMigrations(db);
  return db;
}

export async function closeDb(): Promise<void> {
  if (db) {
    await db.end();
    db = undefined;
  }
}

async function runMigrations(database: DbClient): Promise<void> {
  await database.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer' CHECK(role IN ('viewer', 'analyst', 'admin')),
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      amount DOUBLE PRECISION NOT NULL CHECK(amount > 0),
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      category TEXT NOT NULL,
      date DATE NOT NULL,
      notes TEXT,
      created_by TEXT NOT NULL REFERENCES users(id),
      is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_type
      ON transactions(type)
      WHERE is_deleted = FALSE;
    CREATE INDEX IF NOT EXISTS idx_transactions_category
      ON transactions(category)
      WHERE is_deleted = FALSE;
    CREATE INDEX IF NOT EXISTS idx_transactions_date
      ON transactions(date)
      WHERE is_deleted = FALSE;
    CREATE INDEX IF NOT EXISTS idx_transactions_created_by
      ON transactions(created_by)
      WHERE is_deleted = FALSE;
    CREATE INDEX IF NOT EXISTS idx_users_email
      ON users(email);
  `);
}
