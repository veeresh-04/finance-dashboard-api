import request from 'supertest';
import { setupTestApp, teardownTestApp, seedTestUser } from './helpers';
import { Application } from 'express';
import { Role } from '../models/types';

describe('Transaction Routes', () => {
  let app: Application;
  let adminToken: string;
  let viewerToken: string;
  let analystToken: string;
  let createdTxId: string;

  beforeAll(async () => {
    app = setupTestApp();

    const adminRes = await seedTestUser({
      name: 'Admin',
      email: 'admin@tx.com',
      password: 'password123',
      role: Role.ADMIN,
    });
    adminToken = adminRes.token;

    const viewerRes = await seedTestUser({
      name: 'Viewer',
      email: 'viewer@tx.com',
      password: 'password123',
      role: Role.VIEWER,
    });
    viewerToken = viewerRes.token;

    const analystRes = await seedTestUser({
      name: 'Analyst',
      email: 'analyst@tx.com',
      password: 'password123',
      role: Role.ANALYST,
    });
    analystToken = analystRes.token;
  });

  afterAll(() => {
    teardownTestApp();
  });

  const sampleTx = {
    amount: 5000,
    type: 'income',
    category: 'Salary',
    date: '2024-03-01',
    notes: 'Monthly salary',
  };

  // ── Create ────────────────────────────────────────────────────────────────

  describe('POST /api/v1/transactions', () => {
    it('admin can create a transaction', async () => {
      const res = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(sampleTx);
      expect(res.status).toBe(201);
      expect(res.body.amount).toBe(5000);
      expect(res.body.category).toBe('Salary');
      createdTxId = res.body.id;
    });

    it('viewer cannot create a transaction (403)', async () => {
      const res = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send(sampleTx);
      expect(res.status).toBe(403);
    });

    it('analyst cannot create a transaction (403)', async () => {
      const res = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${analystToken}`)
        .send(sampleTx);
      expect(res.status).toBe(403);
    });

    it('rejects negative amount (422)', async () => {
      const res = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...sampleTx, amount: -100 });
      expect(res.status).toBe(422);
    });

    it('rejects invalid type (422)', async () => {
      const res = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...sampleTx, type: 'invalid' });
      expect(res.status).toBe(422);
    });

    it('rejects invalid date format (422)', async () => {
      const res = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...sampleTx, date: 'not-a-date' });
      expect(res.status).toBe(422);
    });
  });

  // ── Read ──────────────────────────────────────────────────────────────────

  describe('GET /api/v1/transactions', () => {
    it('viewer can list transactions', async () => {
      const res = await request(app)
        .get('/api/v1/transactions')
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
    });

    it('filters by type correctly', async () => {
      const res = await request(app)
        .get('/api/v1/transactions?type=income')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      res.body.data.forEach((tx: { type: string }) => expect(tx.type).toBe('income'));
    });

    it('filters by category correctly', async () => {
      const res = await request(app)
        .get('/api/v1/transactions?category=Salary')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      res.body.data.forEach((tx: { category: string }) => expect(tx.category).toBe('Salary'));
    });

    it('search works across category and notes', async () => {
      const res = await request(app)
        .get('/api/v1/transactions?search=Monthly')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('pagination returns correct structure', async () => {
      const res = await request(app)
        .get('/api/v1/transactions?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(5);
    });
  });

  describe('GET /api/v1/transactions/:id', () => {
    it('returns a specific transaction', async () => {
      const res = await request(app)
        .get(`/api/v1/transactions/${createdTxId}`)
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdTxId);
    });

    it('returns 404 for unknown id', async () => {
      const res = await request(app)
        .get('/api/v1/transactions/nonexistent-id')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
    });
  });

  // ── Update ────────────────────────────────────────────────────────────────

  describe('PATCH /api/v1/transactions/:id', () => {
    it('admin can update a transaction', async () => {
      const res = await request(app)
        .patch(`/api/v1/transactions/${createdTxId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amount: 5500, notes: 'Updated salary' });
      expect(res.status).toBe(200);
      expect(res.body.amount).toBe(5500);
      expect(res.body.notes).toBe('Updated salary');
    });

    it('viewer cannot update a transaction (403)', async () => {
      const res = await request(app)
        .patch(`/api/v1/transactions/${createdTxId}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ amount: 1000 });
      expect(res.status).toBe(403);
    });
  });

  // ── Delete ────────────────────────────────────────────────────────────────

  describe('DELETE /api/v1/transactions/:id', () => {
    it('viewer cannot delete a transaction (403)', async () => {
      const res = await request(app)
        .delete(`/api/v1/transactions/${createdTxId}`)
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(res.status).toBe(403);
    });

    it('admin can soft-delete a transaction', async () => {
      const res = await request(app)
        .delete(`/api/v1/transactions/${createdTxId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(204);
    });

    it('deleted transaction no longer appears in list', async () => {
      const res = await request(app)
        .get(`/api/v1/transactions/${createdTxId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
    });
  });
});
