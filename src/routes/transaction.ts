import { Router, Request, Response } from 'express';
import { TransactionService } from '../services/transaction';
import { authenticate, requireRole } from '../middleware/auth';
import {
  createTransactionValidator,
  updateTransactionValidator,
  listTransactionValidator,
} from '../validators/transaction';
import { handleValidationErrors } from '../middleware/validate';
import { sendSuccess, sendError } from '../utils/response';
import { Role, TransactionFilters } from '../models/types';

const router = Router();
const txService = new TransactionService();

// All transaction routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /transactions:
 *   get:
 *     summary: List transactions with optional filters and pagination
 *     tags: [Transactions]
 *     description: Accessible by all roles. Supports filtering by type, category, date range, and free-text search.
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [income, expense] }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: date_from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: date_to
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Free-text search across category and notes fields
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated list of transactions
 */
router.get(
  '/',
  listTransactionValidator,
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const filters: TransactionFilters = {
        type: req.query.type as TransactionFilters['type'],
        category: req.query.category as string,
        date_from: req.query.date_from as string,
        date_to: req.query.date_to as string,
        search: req.query.search as string,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
      };
      sendSuccess(res, await txService.list(filters));
    } catch (err: unknown) {
      const e = err as Error & { status?: number };
      sendError(res, e.status ?? 500, 'Error', e.message);
    }
  }
);

/**
 * @swagger
 * /transactions/{id}:
 *   get:
 *     summary: Get a single transaction by ID
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Transaction object
 *       404:
 *         description: Not found
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    sendSuccess(res, await txService.getById(req.params.id));
  } catch (err: unknown) {
    const e = err as Error & { status?: number };
    sendError(res, e.status ?? 500, 'Error', e.message);
  }
});

/**
 * @swagger
 * /transactions:
 *   post:
 *     summary: Create a new transaction (Admin only)
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, type, category, date]
 *             properties:
 *               amount:   { type: number, example: 1500.00 }
 *               type:     { type: string, enum: [income, expense] }
 *               category: { type: string, example: Salary }
 *               date:     { type: string, format: date, example: '2024-03-15' }
 *               notes:    { type: string }
 *     responses:
 *       201:
 *         description: Transaction created
 *       403:
 *         description: Forbidden – viewers and analysts cannot create transactions
 */
router.post(
  '/',
  requireRole(Role.ADMIN),
  createTransactionValidator,
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const tx = await txService.create(req.body, req.user!.userId);
      sendSuccess(res, tx, 201);
    } catch (err: unknown) {
      const e = err as Error & { status?: number };
      sendError(res, e.status ?? 500, 'Error', e.message);
    }
  }
);

/**
 * @swagger
 * /transactions/{id}:
 *   patch:
 *     summary: Update a transaction (Admin only)
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Updated transaction
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 */
router.patch(
  '/:id',
  requireRole(Role.ADMIN),
  updateTransactionValidator,
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      sendSuccess(res, await txService.update(req.params.id, req.body));
    } catch (err: unknown) {
      const e = err as Error & { status?: number };
      sendError(res, e.status ?? 500, 'Error', e.message);
    }
  }
);

/**
 * @swagger
 * /transactions/{id}:
 *   delete:
 *     summary: Soft-delete a transaction (Admin only)
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Deleted
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 */
router.delete(
  '/:id',
  requireRole(Role.ADMIN),
  async (req: Request, res: Response) => {
    try {
      await txService.delete(req.params.id);
      res.status(204).send();
    } catch (err: unknown) {
      const e = err as Error & { status?: number };
      sendError(res, e.status ?? 500, 'Error', e.message);
    }
  }
);

export default router;
