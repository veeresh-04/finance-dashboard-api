import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { getDb } from '../db/database';
import { User, UserPublic, CreateUserDTO, UpdateUserDTO, Role, PaginatedResult } from '../models/types';

const SALT_ROUNDS = 10;

function toPublic(user: User): UserPublic {
  const { password_hash: _, ...pub } = user;
  return { ...pub, is_active: Boolean(user.is_active) };
}

export class UserService {
  listUsers(page = 1, limit = 20): PaginatedResult<UserPublic> {
    const db = getDb();
    const offset = (page - 1) * limit;

    const total = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
    const users = db
      .prepare('SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .all(limit, offset) as User[];

    return {
      data: users.map(toPublic),
      pagination: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  getUserById(id: string): UserPublic {
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;

    if (!user) {
      throw Object.assign(new Error('User not found.'), { status: 404 });
    }

    return toPublic(user);
  }

  async createUser(dto: CreateUserDTO): Promise<UserPublic> {
    const db = getDb();

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(dto.email);
    if (existing) {
      throw Object.assign(new Error('Email already in use.'), { status: 409 });
    }

    const id = uuidv4();
    const password_hash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const role = dto.role ?? Role.VIEWER;

    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, dto.name, dto.email, password_hash, role);

    return this.getUserById(id);
  }

  updateUser(id: string, dto: UpdateUserDTO): UserPublic {
    const db = getDb();

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
    if (!user) {
      throw Object.assign(new Error('User not found.'), { status: 404 });
    }

    if (dto.email && dto.email !== user.email) {
      const conflict = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(dto.email, id);
      if (conflict) {
        throw Object.assign(new Error('Email already in use.'), { status: 409 });
      }
    }

    const fields: string[] = [];
    const values: unknown[] = [];

    if (dto.name !== undefined)      { fields.push('name = ?');      values.push(dto.name); }
    if (dto.email !== undefined)     { fields.push('email = ?');     values.push(dto.email); }
    if (dto.role !== undefined)      { fields.push('role = ?');      values.push(dto.role); }
    if (dto.is_active !== undefined) { fields.push('is_active = ?'); values.push(dto.is_active ? 1 : 0); }

    if (fields.length === 0) {
      return toPublic(user);
    }

    fields.push("updated_at = datetime('now')");
    values.push(id);

    db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.getUserById(id);
  }

  deleteUser(id: string): void {
    const db = getDb();
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);

    if (!user) {
      throw Object.assign(new Error('User not found.'), { status: 404 });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);
  }
}