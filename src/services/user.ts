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
  async listUsers(page = 1, limit = 20): Promise<PaginatedResult<UserPublic>> {
    const db = getDb();
    const offset = (page - 1) * limit;

    const totalResult = await db.query('SELECT COUNT(*)::int as count FROM users');
    const total = (totalResult.rows[0] as { count: number }).count;
    const userResult = await db.query(
      'SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    const users = userResult.rows as User[];

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

  async getUserById(id: string): Promise<UserPublic> {
    const db = getDb();
    const userResult = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    const user = userResult.rows[0] as User | undefined;

    if (!user) {
      throw Object.assign(new Error('User not found.'), { status: 404 });
    }

    return toPublic(user);
  }

  async createUser(dto: CreateUserDTO): Promise<UserPublic> {
    const db = getDb();

    const existing = await db.query('SELECT id FROM users WHERE email = $1', [dto.email]);
    if (existing.rowCount) {
      throw Object.assign(new Error('Email already in use.'), { status: 409 });
    }

    const id = uuidv4();
    const password_hash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const role = dto.role ?? Role.VIEWER;

    await db.query(`
      INSERT INTO users (id, name, email, password_hash, role)
      VALUES ($1, $2, $3, $4, $5)
    `, [id, dto.name, dto.email, password_hash, role]);

    return await this.getUserById(id);
  }

  async updateUser(id: string, dto: UpdateUserDTO): Promise<UserPublic> {
    const db = getDb();

    const userResult = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    const user = userResult.rows[0] as User | undefined;
    if (!user) {
      throw Object.assign(new Error('User not found.'), { status: 404 });
    }

    if (dto.email && dto.email !== user.email) {
      const conflict = await db.query('SELECT id FROM users WHERE email = $1 AND id != $2', [dto.email, id]);
      if (conflict.rowCount) {
        throw Object.assign(new Error('Email already in use.'), { status: 409 });
      }
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    if (dto.name !== undefined)      { fields.push(`name = $${index++}`); values.push(dto.name); }
    if (dto.email !== undefined)     { fields.push(`email = $${index++}`); values.push(dto.email); }
    if (dto.role !== undefined)      { fields.push(`role = $${index++}`); values.push(dto.role); }
    if (dto.is_active !== undefined) { fields.push(`is_active = $${index++}`); values.push(dto.is_active); }

    if (fields.length === 0) {
      return toPublic(user);
    }

    fields.push('updated_at = NOW()');
    values.push(id);

    await db.query(`UPDATE users SET ${fields.join(', ')} WHERE id = $${index}`, values);
    return await this.getUserById(id);
  }

  async deleteUser(id: string): Promise<void> {
    const db = getDb();
    const user = await db.query('SELECT id FROM users WHERE id = $1', [id]);

    if (!user.rowCount) {
      throw Object.assign(new Error('User not found.'), { status: 404 });
    }

    await db.query('DELETE FROM users WHERE id = $1', [id]);
  }
}
