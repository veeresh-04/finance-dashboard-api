import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { sendError } from '../utils/response';

/**
 * Reads express-validator results and short-circuits with a 422 if any
 * validation errors are present.
 */
export function handleValidationErrors(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    sendError(res, 422, 'Validation Error', 'Invalid input data.', errors.array());
    return;
  }

  next();
}