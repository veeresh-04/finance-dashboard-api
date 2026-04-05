import { Router, Request, Response } from 'express';
import { UserService } from '../services/user';
import { authenticate, requireRole } from '../middleware/auth';
import { registerValidator } from '../validators/auth';
import { updateUserValidator } from '../validators/user';
import { handleValidationErrors } from '../middleware/validate';
import { sendSuccess, sendError } from '../utils/response';
import { Role } from '../models/types';

const router = Router();
const userService = new UserService();

// All user management routes require authentication + admin role
router.use(authenticate, requireRole(Role.ADMIN));

/**
 * @swagger
 * /users:
 *   get:
 *     summary: List all users (Admin only)
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated list of users
 *       403:
 *         description: Forbidden
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    sendSuccess(res, await userService.listUsers(page, limit));
  } catch (err: unknown) {
    const e = err as Error & { status?: number };
    sendError(res, e.status ?? 500, 'Error', e.message);
  }
});

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get a user by ID (Admin only)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User object
 *       404:
 *         description: Not found
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    sendSuccess(res, await userService.getUserById(req.params.id));
  } catch (err: unknown) {
    const e = err as Error & { status?: number };
    sendError(res, e.status ?? 500, 'Error', e.message);
  }
});

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create a new user (Admin only)
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:     { type: string }
 *               email:    { type: string }
 *               password: { type: string }
 *               role:     { type: string, enum: [viewer, analyst, admin] }
 *     responses:
 *       201:
 *         description: User created
 *       409:
 *         description: Email conflict
 */
router.post(
  '/',
  registerValidator,
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const user = await userService.createUser(req.body);
      sendSuccess(res, user, 201);
    } catch (err: unknown) {
      const e = err as Error & { status?: number };
      sendError(res, e.status ?? 500, 'Error', e.message);
    }
  }
);

/**
 * @swagger
 * /users/{id}:
 *   patch:
 *     summary: Update a user (Admin only)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:      { type: string }
 *               email:     { type: string }
 *               role:      { type: string }
 *               is_active: { type: boolean }
 *     responses:
 *       200:
 *         description: Updated user
 */
router.patch(
  '/:id',
  updateUserValidator,
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      sendSuccess(res, await userService.updateUser(req.params.id, req.body));
    } catch (err: unknown) {
      const e = err as Error & { status?: number };
      sendError(res, e.status ?? 500, 'Error', e.message);
    }
  }
);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete a user (Admin only)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Deleted
 *       404:
 *         description: Not found
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    // Prevent admin from deleting themselves
    if (req.params.id === req.user!.userId) {
      sendError(res, 400, 'Bad Request', 'You cannot delete your own account.');
      return;
    }
    await userService.deleteUser(req.params.id);
    res.status(204).send();
  } catch (err: unknown) {
    const e = err as Error & { status?: number };
    sendError(res, e.status ?? 500, 'Error', e.message);
  }
});

export default router;
