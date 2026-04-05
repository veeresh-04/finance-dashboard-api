import request from 'supertest';
import { setupTestApp, teardownTestApp, seedTestUser } from './helpers';
import { Application } from 'express';
import { Role } from '../models/types';

describe('Dashboard Routes', () => {
  let app: Application;
  let adminToken: string;
  let viewerToken: string;

  beforeAll(async () => {
    app = await setupTestApp();

    const adminRes = await seedTestUser({
      name: 'Admin',
      email: 'admin@dash.com',
      password: 'password123',
      role: Role.ADMIN,
    });
    adminToken = adminRes.token;

    const viewerRes = await seedTestUser({
      name: 'Viewer',
      email: 'viewer@dash.com',
      password: 'password123',
      role: Role.VIEWER,
    });
    viewerToken = viewerRes.token;

    // Seed some transactions
    const transactions = [
      { amount: 5000, type: 'income',  category: 'Salary',   date: '2024-01-15' },
      { amount: 2000, type: 'income',  category: 'Freelance', date: '2024-01-20' },
      { amount: 800,  type: 'expense', category: 'Rent',      date: '2024-01-05' },
      { amount: 200,  type: 'expense', category: 'Food',      date: '2024-01-10' },
      { amount: 3000, type: 'income',  category: 'Salary',   date: '2024-02-15' },
      { amount: 500,  type: 'expense', category: 'Utilities', date: '2024-02-08' },
    ];

    for (const tx of transactions) {
      await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(tx);
    }
  });

  afterAll(async () => {
    await teardownTestApp();
  });

  describe('GET /api/v1/dashboard/summary', () => {
    it('returns summary with correct shape', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('total_income');
      expect(res.body).toHaveProperty('total_expenses');
      expect(res.body).toHaveProperty('net_balance');
      expect(res.body).toHaveProperty('transaction_count');
      expect(res.body).toHaveProperty('income_by_category');
      expect(res.body).toHaveProperty('expense_by_category');
      expect(res.body).toHaveProperty('monthly_trends');
      expect(res.body).toHaveProperty('recent_transactions');
    });

    it('calculates totals correctly', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      // 5000 + 2000 + 3000 = 10000 income
      expect(res.body.total_income).toBe(10000);
      // 800 + 200 + 500 = 1500 expenses
      expect(res.body.total_expenses).toBe(1500);
      // net = 10000 - 1500 = 8500
      expect(res.body.net_balance).toBe(8500);
      expect(res.body.transaction_count).toBe(6);
    });

    it('viewer can access dashboard summary', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/summary')
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(res.status).toBe(200);
    });

    it('unauthenticated request is rejected (401)', async () => {
      const res = await request(app).get('/api/v1/dashboard/summary');
      expect(res.status).toBe(401);
    });

    it('date range filtering works', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/summary?date_from=2024-02-01&date_to=2024-02-28')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      // Only Feb transactions: income 3000, expense 500
      expect(res.body.total_income).toBe(3000);
      expect(res.body.total_expenses).toBe(500);
      expect(res.body.monthly_trends).toEqual([
        { month: '2024-02', income: 3000, expenses: 500, net: 2500 },
      ]);
    });

    it('category totals are sorted by amount descending', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/summary')
        .set('Authorization', `Bearer ${adminToken}`);
      const incomeCats = res.body.income_by_category;
      expect(incomeCats.length).toBeGreaterThan(0);
      // Salary (8000) should be first
      expect(incomeCats[0].category).toBe('Salary');
    });

    it('returns recent_transactions limited to 10', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/summary')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.body.recent_transactions.length).toBeLessThanOrEqual(10);
    });
  });
});
