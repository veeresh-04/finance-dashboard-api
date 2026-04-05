import { body, param } from 'express-validator';
import { Role } from '../models/types';

export const updateUserValidator = [
  param('id').notEmpty().withMessage('User ID is required.'),

  body('name')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Name must be at most 100 characters.'),

  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Must be a valid email address.')
    .normalizeEmail(),

  body('role')
    .optional()
    .isIn(Object.values(Role)).withMessage(`Role must be one of: ${Object.values(Role).join(', ')}.`),

  body('is_active')
    .optional()
    .isBoolean().withMessage('is_active must be a boolean.'),
];