import { Response } from 'express';

export function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  res.status(statusCode).json(data);
}

export function sendError(
  res: Response,
  statusCode: number,
  error: string,
  message: string,
  details?: unknown
): void {
  const body: Record<string, unknown> = { error, message };
  if (details !== undefined) body.details = details;
  res.status(statusCode).json(body);
}