import request from 'supertest';
import { setupTestApp, teardownTestApp, seedTestUser } from './helpers';
import { Application } from 'express';
import { Role } from '../models/types';

describe('Auth Routes', () => {
  let app: Application;
  let adminToken: string;

  beforeAll(() => {
    app = setupTestApp();
  });

  afterAll(() => {
    teardownTestApp();
  });

  const adminUser = {
    name: 'Admin User',
    email: 'admin@test.com',
    password: 'password123',
  };

  let authToken: string;

  beforeAll(async () => {
    const admin = await seedTestUser({
      name: 'Existing Admin',
      email: 'existing-admin@test.com',
      password: 'password123',
      role: Role.ADMIN,
    });
    adminToken = admin.token;
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user and return a token', async () => {
      const res = await request(app).post('/api/v1/auth/register').send(adminUser);
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe(adminUser.email);
      expect(res.body.user.role).toBe('viewer');
      expect(res.body.user).not.toHaveProperty('password_hash');
      authToken = res.body.token;
    });

    it('should reject duplicate email with 409', async () => {
      const res = await request(app).post('/api/v1/auth/register').send(adminUser);
      expect(res.status).toBe(409);
    });

    it('should reject missing fields with 422', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({ email: 'x@x.com' });
      expect(res.status).toBe(422);
    });

    it('should reject short password with 422', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'Test', email: 'new@test.com', password: '123' });
      expect(res.status).toBe(422);
    });

    it('should reject attempts to choose a role during public registration', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'Test', email: 'admin-attempt@test.com', password: 'password123', role: 'admin' });
      expect(res.status).toBe(422);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login and return a token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: adminUser.email, password: adminUser.password });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
    });

    it('should reject wrong password with 401', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: adminUser.email, password: 'wrongpassword' });
      expect(res.status).toBe(401);
    });

    it('should reject unknown email with 401', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@test.com', password: 'password123' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return the current user profile', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.email).toBe(adminUser.email);
    });

    it('should reject requests without a token', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });

    it('should reject requests with an invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalidtoken');
      expect(res.status).toBe(401);
    });

    it('should reject access for a user deactivated after token issuance', async () => {
      const seededUser = await seedTestUser({
        name: 'Deactivated Later',
        email: 'inactive-after-login@test.com',
        password: 'password123',
        role: Role.VIEWER,
      });

      const deactivateRes = await request(app)
        .patch(`/api/v1/users/${seededUser.user.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ is_active: false });
      expect(deactivateRes.status).toBe(200);

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${seededUser.token}`);
      expect(res.status).toBe(403);
    });
  });
});
