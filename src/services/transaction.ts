import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database';
import {
  Transaction,
  CreateTransactionDTO,
  UpdateTransactionDTO,
  TransactionFilters,
  PaginatedResult,
} from '../models/types';

function rowToTransaction(row: Record<string, unknown>): Transaction {
  const transaction = row as unknown as Transaction;

  return {
    ...transaction,
    is_deleted: Boolean(row.is_deleted),
  };
}

export class TransactionService {
  list(filters: TransactionFilters): PaginatedResult<Transaction> {
    const db = getDb();
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const offset = (page - 1) * limit;

    const { whereClause, params } = this.buildWhereClause(filters);

    const total = (
      db.prepare(`SELECT COUNT(*) as count FROM transactions ${whereClause}`).get(...params) as { count: number }
    ).count;

    const rows = db
      .prepare(`SELECT * FROM transactions ${whereClause} ORDER BY date DESC, created_at DESC LIMIT ? OFFSET ?`)
      .all(...params, limit, offset) as Record<string, unknown>[];

    return {
      data: rows.map(rowToTransaction),
      pagination: { total, page, limit, total_pages: Math.ceil(total / limit) },
    };
  }

  getById(id: string): Transaction {
    const db = getDb();
    const row = db
      .prepare('SELECT * FROM transactions WHERE id = ? AND is_deleted = 0')
      .get(id) as Record<string, unknown> | undefined;

    if (!row) {
      throw Object.assign(new Error('Transaction not found.'), { status: 404 });
    }

    return rowToTransaction(row);
  }

  create(dto: CreateTransactionDTO, userId: string): Transaction {
    const db = getDb();
    const id = uuidv4();
    const date = typeof dto.date === 'object'
      ? (dto.date as Date).toISOString().split('T')[0]
      : dto.date;

    db.prepare(`
      INSERT INTO transactions (id, amount, type, category, date, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, dto.amount, dto.type, dto.category, date, dto.notes ?? null, userId);

    return this.getById(id);
  }

  update(id: string, dto: UpdateTransactionDTO): Transaction {
    const db = getDb();
    const existing = db
      .prepare('SELECT * FROM transactions WHERE id = ? AND is_deleted = 0')
      .get(id);

    if (!existing) {
      throw Object.assign(new Error('Transaction not found.'), { status: 404 });
    }

    const fields: string[] = [];
    const values: unknown[] = [];

    if (dto.amount !== undefined)   { fields.push('amount = ?');   values.push(dto.amount); }
    if (dto.type !== undefined)     { fields.push('type = ?');     values.push(dto.type); }
    if (dto.category !== undefined) { fields.push('category = ?'); values.push(dto.category); }
    if (dto.notes !== undefined)    { fields.push('notes = ?');    values.push(dto.notes); }
    if (dto.date !== undefined) {
      const date = typeof dto.date === 'object'
        ? (dto.date as unknown as Date).toISOString().split('T')[0]
        : dto.date;
      fields.push('date = ?');
      values.push(date);
    }

    if (fields.length === 0) {
      return this.getById(id);
    }

    fields.push("updated_at = datetime('now')");
    values.push(id);

    db.prepare(`UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.getById(id);
  }

  /** Soft delete — sets is_deleted = 1 */
  delete(id: string): void {
    const db = getDb();
    const existing = db
      .prepare('SELECT id FROM transactions WHERE id = ? AND is_deleted = 0')
      .get(id);

    if (!existing) {
      throw Object.assign(new Error('Transaction not found.'), { status: 404 });
    }

    db.prepare(`
      UPDATE transactions SET is_deleted = 1, updated_at = datetime('now') WHERE id = ?
    `).run(id);
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private buildWhereClause(filters: TransactionFilters): { whereClause: string; params: unknown[] } {
    const conditions: string[] = ['is_deleted = 0'];
    const params: unknown[] = [];

    if (filters.type) {
      conditions.push('type = ?');
      params.push(filters.type);
    }

    if (filters.category) {
      conditions.push('category = ?');
      params.push(filters.category);
    }

    if (filters.date_from) {
      conditions.push('date >= ?');
      params.push(filters.date_from);
    }

    if (filters.date_to) {
      conditions.push('date <= ?');
      params.push(filters.date_to);
    }

    if (filters.search) {
      conditions.push('(category LIKE ? OR notes LIKE ?)');
      const pattern = `%${filters.search}%`;
      params.push(pattern, pattern);
    }

    return {
      whereClause: `WHERE ${conditions.join(' AND ')}`,
      params,
    };
  }
}
