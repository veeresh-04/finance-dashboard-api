import request from 'supertest';
import { setupTestApp, teardownTestApp, seedTestUser } from './helpers';
import { Application } from 'express';
import { Role } from '../models/types';

describe('User Routes', () => {
  let app: Application;
  let adminToken: string;
  let viewerToken: string;
  let createdUserId: string;

  beforeAll(async () => {
    app = setupTestApp();

    const adminRes = await seedTestUser({
      name: 'Admin',
      email: 'admin@users.com',
      password: 'password123',
      role: Role.ADMIN,
    });
    adminToken = adminRes.token;

    const viewerRes = await seedTestUser({
      name: 'Viewer',
      email: 'viewer@users.com',
      password: 'password123',
      role: Role.VIEWER,
    });
    viewerToken = viewerRes.token;
  });

  afterAll(() => {
    teardownTestApp();
  });

  describe('GET /api/v1/users (Admin only)', () => {
    it('admin can list users', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
    });

    it('viewer cannot list users (403)', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/v1/users (Admin only)', () => {
    it('admin can create a user', async () => {
      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'New Analyst', email: 'analyst@users.com', password: 'password123', role: 'analyst' });
      expect(res.status).toBe(201);
      expect(res.body.role).toBe('analyst');
      createdUserId = res.body.id;
    });

    it('viewer cannot create a user (403)', async () => {
      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ name: 'X', email: 'x@x.com', password: 'password123' });
      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/v1/users/:id (Admin only)', () => {
    it('admin can update user role', async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'viewer' });
      expect(res.status).toBe(200);
      expect(res.body.role).toBe('viewer');
    });

    it('admin can deactivate a user', async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ is_active: false });
      expect(res.status).toBe(200);
      expect(res.body.is_active).toBe(false);
    });

    it('returns 404 for unknown user id', async () => {
      const res = await request(app)
        .patch('/api/v1/users/nonexistent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Ghost' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/users/:id (Admin only)', () => {
    it('admin can delete a user', async () => {
      const res = await request(app)
        .delete(`/api/v1/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(204);
    });

    it('admin cannot delete themselves', async () => {
      // Get admin's own id
      const me = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);
      const adminId = me.body.id;

      const res = await request(app)
        .delete(`/api/v1/users/${adminId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });
  });
});
