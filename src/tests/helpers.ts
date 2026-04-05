import { initDb, closeDb, getDb } from '../db/database';
import { createApp } from '../app';
import { Application } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { signToken } from '../utils/jwt';
import { Role, User } from '../models/types';
import { newDb } from 'pg-mem';
import { Pool } from 'pg';

export async function setupTestApp(): Promise<Application> {
  const mem = newDb();
  const adapter = mem.adapters.createPg();
  const pool = new adapter.Pool() as Pool;
  await initDb(pool);
  return createApp();
}

export async function teardownTestApp(): Promise<void> {
  await closeDb();
}

type SeedUserInput = {
  name: string;
  email: string;
  password: string;
  role?: Role;
  is_active?: boolean;
};

export async function seedTestUser(input: SeedUserInput): Promise<{ token: string; user: User }> {
  const db = getDb();
  const id = uuidv4();
  const passwordHash = await bcrypt.hash(input.password, 10);
  const role = input.role ?? Role.VIEWER;
  const isActive = input.is_active ?? true;

  await db.query(`
    INSERT INTO users (id, name, email, password_hash, role, is_active)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [id, input.name, input.email, passwordHash, role, isActive]);

  const userResult = await db.query('SELECT * FROM users WHERE id = $1', [id]);
  const user = userResult.rows[0] as User;
  const token = signToken({ userId: user.id, role: user.role });

  return { token, user };
}
