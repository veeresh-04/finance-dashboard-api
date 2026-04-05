import { Router, Request, Response } from 'express';
import { DashboardService } from '../services/dashboard';
import { authenticate, requireRole } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/response';
import { Role } from '../models/types';
import { query } from 'express-validator';
import { handleValidationErrors } from '../middleware/validate';

const router = Router();
const dashboardService = new DashboardService();

/**
 * @swagger
 * /dashboard/summary:
 *   get:
 *     summary: Get dashboard summary (all roles)
 *     tags: [Dashboard]
 *     description: |
 *       Returns aggregated financial data including totals, category breakdowns,
 *       monthly trends (last 12 months), and 10 most recent transactions.
 *       Accessible by Viewer, Analyst, and Admin roles.
 *     parameters:
 *       - in: query
 *         name: date_from
 *         schema: { type: string, format: date }
 *         description: Filter summary data from this date
 *       - in: query
 *         name: date_to
 *         schema: { type: string, format: date }
 *         description: Filter summary data up to this date
 *     responses:
 *       200:
 *         description: Dashboard summary
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardSummary'
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/summary',
  authenticate,
  requireRole(Role.VIEWER),
  [
    query('date_from').optional().isISO8601().withMessage('date_from must be a valid ISO date.'),
    query('date_to').optional().isISO8601().withMessage('date_to must be a valid ISO date.'),
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const summary = await dashboardService.getSummary(
        req.query.date_from as string | undefined,
        req.query.date_to as string | undefined
      );
      sendSuccess(res, summary);
    } catch (err: unknown) {
      const e = err as Error & { status?: number };
      sendError(res, e.status ?? 500, 'Error', e.message);
    }
  }
);

export default router;
