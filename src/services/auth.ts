import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database';
import { signToken } from '../utils/jwt';
import {
  User,
  UserPublic,
  CreateUserDTO,
  LoginDTO,
  AuthResponse,
  Role,
} from '../models/types';

const SALT_ROUNDS = 10;

function toPublic(user: User): UserPublic {
  const { password_hash: _, ...pub } = user;
  return { ...pub, is_active: Boolean(user.is_active) };
}

export class AuthService {
  async register(dto: CreateUserDTO): Promise<AuthResponse> {
    const db = getDb();

    const existing = await db.query('SELECT id FROM users WHERE email = $1', [dto.email]);

    if (existing.rowCount) {
      throw Object.assign(new Error('Email already in use.'), { status: 409 });
    }

    const password_hash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const id = uuidv4();
    const role = Role.VIEWER;

    await db.query(`
      INSERT INTO users (id, name, email, password_hash, role)
      VALUES ($1, $2, $3, $4, $5)
    `, [id, dto.name, dto.email, password_hash, role]);

    const userResult = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    const user = userResult.rows[0] as User;

    const token = signToken({ userId: user.id, role: user.role });
    return { token, user: toPublic(user) };
  }

  async login(dto: LoginDTO): Promise<AuthResponse> {
    const db = getDb();

    const userResult = await db.query('SELECT * FROM users WHERE email = $1', [dto.email]);
    const user = userResult.rows[0] as User | undefined;

    // Use constant-time comparison even on miss to prevent timing attacks
    const hashToCompare = user?.password_hash ?? '$2b$10$invalidhashfortimingprotection';
    const valid = await bcrypt.compare(dto.password, hashToCompare);

    if (!user || !valid) {
      throw Object.assign(new Error('Invalid email or password.'), { status: 401 });
    }

    if (!user.is_active) {
      throw Object.assign(new Error('Account is deactivated.'), { status: 403 });
    }

    const token = signToken({ userId: user.id, role: user.role });
    return { token, user: toPublic(user) };
  }

  async getProfile(userId: string): Promise<UserPublic> {
    const db = getDb();
    const userResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0] as User | undefined;

    if (!user) {
      throw Object.assign(new Error('User not found.'), { status: 404 });
    }

    return toPublic(user);
  }
}
