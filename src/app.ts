import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';

import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import transactionRoutes from './routes/transaction';
import dashboardRoutes from './routes/dashboard';

export function createApp(): express.Application {
  const app = express();

  // ── Global middleware ──────────────────────────────────────────────────────
  app.use(cors());
  app.use(express.json());

  // Rate limiting – 100 requests per 15 minutes per IP
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too Many Requests', message: 'Please slow down and try again later.' },
    })
  );

  // ── API documentation ──────────────────────────────────────────────────────
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));

  app.get('/', (_req, res) => {
    res.json({
      message: 'Finance Dashboard API is running.',
      links: {
        health: '/health',
        docs: '/api-docs',
        openapi: '/api-docs.json',
      },
    });
  });

  // ── Health check ───────────────────────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ── API routes ─────────────────────────────────────────────────────────────
  app.use('/api/v1/auth',         authRoutes);
  app.use('/api/v1/users',        userRoutes);
  app.use('/api/v1/transactions', transactionRoutes);
  app.use('/api/v1/dashboard',    dashboardRoutes);

  // ── 404 handler ────────────────────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not Found', message: 'The requested resource does not exist.' });
  });

  // ── Global error handler ───────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[Unhandled Error]', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'An unexpected error occurred.' });
  });

  return app;
}
