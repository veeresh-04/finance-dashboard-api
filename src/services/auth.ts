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

    const existing = db
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(dto.email);

    if (existing) {
      throw Object.assign(new Error('Email already in use.'), { status: 409 });
    }

    const password_hash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const id = uuidv4();
    const role = Role.VIEWER;

    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, dto.name, dto.email, password_hash, role);

    const user = db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(id) as User;

    const token = signToken({ userId: user.id, role: user.role });
    return { token, user: toPublic(user) };
  }

  async login(dto: LoginDTO): Promise<AuthResponse> {
    const db = getDb();

    const user = db
      .prepare('SELECT * FROM users WHERE email = ?')
      .get(dto.email) as User | undefined;

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

  getProfile(userId: string): UserPublic {
    const db = getDb();
    const user = db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(userId) as User | undefined;

    if (!user) {
      throw Object.assign(new Error('User not found.'), { status: 404 });
    }

    return toPublic(user);
  }
}
