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
  async list(filters: TransactionFilters): Promise<PaginatedResult<Transaction>> {
    const db = getDb();
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const offset = (page - 1) * limit;

    const { whereClause, params } = this.buildWhereClause(filters);

    const totalResult = await db.query(
      `SELECT COUNT(*)::int as count FROM transactions ${whereClause}`,
      params
    );
    const total = (totalResult.rows[0] as { count: number }).count;

    const rowsResult = await db.query(
      `SELECT * FROM transactions ${whereClause} ORDER BY date DESC, created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    const rows = rowsResult.rows as Record<string, unknown>[];

    return {
      data: rows.map(rowToTransaction),
      pagination: { total, page, limit, total_pages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string): Promise<Transaction> {
    const db = getDb();
    const rowResult = await db.query(
      'SELECT * FROM transactions WHERE id = $1 AND is_deleted = FALSE',
      [id]
    );
    const row = rowResult.rows[0] as Record<string, unknown> | undefined;

    if (!row) {
      throw Object.assign(new Error('Transaction not found.'), { status: 404 });
    }

    return rowToTransaction(row);
  }

  async create(dto: CreateTransactionDTO, userId: string): Promise<Transaction> {
    const db = getDb();
    const id = uuidv4();
    const date = typeof dto.date === 'object'
      ? (dto.date as Date).toISOString().split('T')[0]
      : dto.date;

    await db.query(`
      INSERT INTO transactions (id, amount, type, category, date, notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [id, dto.amount, dto.type, dto.category, date, dto.notes ?? null, userId]);

    return await this.getById(id);
  }

  async update(id: string, dto: UpdateTransactionDTO): Promise<Transaction> {
    const db = getDb();
    const existing = await db.query(
      'SELECT id FROM transactions WHERE id = $1 AND is_deleted = FALSE',
      [id]
    );

    if (!existing.rowCount) {
      throw Object.assign(new Error('Transaction not found.'), { status: 404 });
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    if (dto.amount !== undefined)   { fields.push(`amount = $${index++}`); values.push(dto.amount); }
    if (dto.type !== undefined)     { fields.push(`type = $${index++}`); values.push(dto.type); }
    if (dto.category !== undefined) { fields.push(`category = $${index++}`); values.push(dto.category); }
    if (dto.notes !== undefined)    { fields.push(`notes = $${index++}`); values.push(dto.notes); }
    if (dto.date !== undefined) {
      const date = typeof dto.date === 'object'
        ? (dto.date as unknown as Date).toISOString().split('T')[0]
        : dto.date;
      fields.push(`date = $${index++}`);
      values.push(date);
    }

    if (fields.length === 0) {
      return await this.getById(id);
    }

    fields.push('updated_at = NOW()');
    values.push(id);

    await db.query(`UPDATE transactions SET ${fields.join(', ')} WHERE id = $${index}`, values);
    return await this.getById(id);
  }

  /** Soft delete — sets is_deleted = 1 */
  async delete(id: string): Promise<void> {
    const db = getDb();
    const existing = await db.query(
      'SELECT id FROM transactions WHERE id = $1 AND is_deleted = FALSE',
      [id]
    );

    if (!existing.rowCount) {
      throw Object.assign(new Error('Transaction not found.'), { status: 404 });
    }

    await db.query(
      'UPDATE transactions SET is_deleted = TRUE, updated_at = NOW() WHERE id = $1',
      [id]
    );
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private buildWhereClause(filters: TransactionFilters): { whereClause: string; params: unknown[] } {
    const conditions: string[] = ['is_deleted = FALSE'];
    const params: unknown[] = [];

    if (filters.type) {
      conditions.push(`type = $${params.length + 1}`);
      params.push(filters.type);
    }

    if (filters.category) {
      conditions.push(`category = $${params.length + 1}`);
      params.push(filters.category);
    }

    if (filters.date_from) {
      conditions.push(`date >= $${params.length + 1}`);
      params.push(filters.date_from);
    }

    if (filters.date_to) {
      conditions.push(`date <= $${params.length + 1}`);
      params.push(filters.date_to);
    }

    if (filters.search) {
      conditions.push(`(category ILIKE $${params.length + 1} OR notes ILIKE $${params.length + 2})`);
      const pattern = `%${filters.search}%`;
      params.push(pattern, pattern);
    }

    return {
      whereClause: `WHERE ${conditions.join(' AND ')}`,
      params,
    };
  }
}
