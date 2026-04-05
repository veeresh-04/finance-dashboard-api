import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { Role, ROLE_HIERARCHY, AuthPayload } from '../models/types';
import { sendError } from '../utils/response';

// Augment Express Request to carry the authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

/**
 * Verifies the JWT in the Authorization header and attaches the decoded
 * payload to `req.user`. Rejects with 401 if missing or invalid.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 401, 'Unauthorized', 'Missing or malformed Authorization header.');
    return;
  }

  const token = authHeader.slice(7);

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    sendError(res, 401, 'Unauthorized', 'Invalid or expired token.');
  }
}

/**
 * Returns middleware that allows only users whose role meets the minimum
 * required level. Must be used after `authenticate`.
 *
 * Usage: router.get('/...', authenticate, requireRole(Role.ANALYST), handler)
 */
export function requireRole(minRole: Role) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      sendError(res, 401, 'Unauthorized', 'Authentication required.');
      return;
    }

    const userLevel = ROLE_HIERARCHY[user.role] ?? -1;
    const requiredLevel = ROLE_HIERARCHY[minRole];

    if (userLevel < requiredLevel) {
      sendError(
        res,
        403,
        'Forbidden',
        `This action requires the '${minRole}' role or higher.`
      );
      return;
    }

    next();
  };
}