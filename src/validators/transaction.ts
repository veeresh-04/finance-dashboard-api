import { body, query, param } from 'express-validator';
import { TransactionType } from '../models/types';

const VALID_TYPES = Object.values(TransactionType);

export const createTransactionValidator = [
  body('amount')
    .notEmpty().withMessage('Amount is required.')
    .isFloat({ gt: 0 }).withMessage('Amount must be a positive number.'),

  body('type')
    .notEmpty().withMessage('Type is required.')
    .isIn(VALID_TYPES).withMessage(`Type must be one of: ${VALID_TYPES.join(', ')}.`),

  body('category')
    .trim()
    .notEmpty().withMessage('Category is required.')
    .isLength({ max: 100 }).withMessage('Category must be at most 100 characters.'),

  body('date')
    .notEmpty().withMessage('Date is required.')
    .isISO8601().withMessage('Date must be a valid ISO date (YYYY-MM-DD).')
    .toDate(),

  body('notes')
    .optional()
    .isString()
    .isLength({ max: 500 }).withMessage('Notes must be at most 500 characters.'),
];

export const updateTransactionValidator = [
  param('id').notEmpty().withMessage('Transaction ID is required.'),

  body('amount')
    .optional()
    .isFloat({ gt: 0 }).withMessage('Amount must be a positive number.'),

  body('type')
    .optional()
    .isIn(VALID_TYPES).withMessage(`Type must be one of: ${VALID_TYPES.join(', ')}.`),

  body('category')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Category must be at most 100 characters.'),

  body('date')
    .optional()
    .isISO8601().withMessage('Date must be a valid ISO date (YYYY-MM-DD).')
    .toDate(),

  body('notes')
    .optional()
    .isString()
    .isLength({ max: 500 }).withMessage('Notes must be at most 500 characters.'),
];

export const listTransactionValidator = [
  query('type').optional().isIn(VALID_TYPES).withMessage(`Type filter must be one of: ${VALID_TYPES.join(', ')}.`),
  query('category').optional().isString(),
  query('date_from').optional().isISO8601().withMessage('date_from must be a valid ISO date.'),
  query('date_to').optional().isISO8601().withMessage('date_to must be a valid ISO date.'),
  query('search').optional().isString(),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer.').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100.').toInt(),
];