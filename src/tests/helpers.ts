import { initDb, closeDb } from '../db/database';
import { getDb } from '../db/database';
import { createApp } from '../app';
import { Application } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { signToken } from '../utils/jwt';
import { Role, User } from '../models/types';

export function setupTestApp(): Application {
  // Use in-memory SQLite for tests
  initDb(':memory:');
  return createApp();
}

export function teardownTestApp(): void {
  closeDb();
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

  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, is_active)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, input.name, input.email, passwordHash, role, isActive ? 1 : 0);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User;
  const token = signToken({ userId: user.id, role: user.role });

  return { token, user };
}
