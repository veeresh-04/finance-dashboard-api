import { Router, Request, Response } from 'express';
import { AuthService } from '../services/auth';
import { authenticate } from '../middleware/auth';
import { publicRegisterValidator, loginValidator } from '../validators/auth';
import { handleValidationErrors } from '../middleware/validate';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();
const authService = new AuthService();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new viewer account
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:    { type: string, example: Alice Smith }
 *               email:   { type: string, example: alice@example.com }
 *               password: { type: string, example: securepass123 }
 *     responses:
 *       201:
 *         description: Viewer account created, returns JWT token and user object
 *       409:
 *         description: Email already in use
 *       422:
 *         description: Validation error
 */
router.post(
  '/register',
  publicRegisterValidator,
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const result = await authService.register(req.body);
      sendSuccess(res, result, 201);
    } catch (err: unknown) {
      const e = err as Error & { status?: number };
      sendError(res, e.status ?? 500, 'Registration Failed', e.message);
    }
  }
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login and receive a JWT token
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:    { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post(
  '/login',
  loginValidator,
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const result = await authService.login(req.body);
      sendSuccess(res, result);
    } catch (err: unknown) {
      const e = err as Error & { status?: number };
      sendError(res, e.status ?? 500, 'Login Failed', e.message);
    }
  }
);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get the currently authenticated user's profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *       401:
 *         description: Unauthorized
 */
router.get('/me', authenticate, (req: Request, res: Response) => {
  try {
    const user = authService.getProfile(req.user!.userId);
    sendSuccess(res, user);
  } catch (err: unknown) {
    const e = err as Error & { status?: number };
    sendError(res, e.status ?? 500, 'Error', e.message);
  }
});

export default router;
