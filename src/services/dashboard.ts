import { getDb } from '../db/database';
import { DashboardSummary, CategoryTotal, MonthlyTrend, Transaction } from '../models/types';

function rowToTransaction(row: Record<string, unknown>): Transaction {
  const transaction = row as unknown as Transaction;

  return {
    ...transaction,
    is_deleted: Boolean(row.is_deleted),
  };
}

export class DashboardService {
  getSummary(dateFrom?: string, dateTo?: string): DashboardSummary {
    const db = getDb();

    const dateConditions: string[] = ['is_deleted = 0'];
    const dateParams: unknown[] = [];

    if (dateFrom) { dateConditions.push('date >= ?'); dateParams.push(dateFrom); }
    if (dateTo)   { dateConditions.push('date <= ?'); dateParams.push(dateTo); }

    const dateWhere = `WHERE ${dateConditions.join(' AND ')}`;
    const trendConditions = [...dateConditions];
    const trendParams = [...dateParams];

    if (!dateFrom && !dateTo) {
      trendConditions.push("date >= date('now', '-12 months')");
    }

    const trendWhere = `WHERE ${trendConditions.join(' AND ')}`;

    // ── Totals ──────────────────────────────────────────────────────────────
    const totals = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END), 0) AS total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expenses,
        COUNT(*) AS transaction_count
      FROM transactions
      ${dateWhere}
    `).get(...dateParams) as {
      total_income: number;
      total_expenses: number;
      transaction_count: number;
    };

    // ── Category breakdowns ──────────────────────────────────────────────────
    const incomeByCategory = db.prepare(`
      SELECT category, SUM(amount) AS total, COUNT(*) AS count
      FROM transactions
      ${dateWhere} AND type = 'income'
      GROUP BY category
      ORDER BY total DESC
    `).all(...dateParams) as CategoryTotal[];

    const expenseByCategory = db.prepare(`
      SELECT category, SUM(amount) AS total, COUNT(*) AS count
      FROM transactions
      ${dateWhere} AND type = 'expense'
      GROUP BY category
      ORDER BY total DESC
    `).all(...dateParams) as CategoryTotal[];

    // ── Monthly trends (last 12 months) ─────────────────────────────────────
    const monthlyRaw = db.prepare(`
      SELECT
        strftime('%Y-%m', date) AS month,
        COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expenses
      FROM transactions
      ${trendWhere}
      GROUP BY month
      ORDER BY month ASC
    `).all(...trendParams) as { month: string; income: number; expenses: number }[];

    const monthly_trends: MonthlyTrend[] = monthlyRaw.map((r) => ({
      month: r.month,
      income: r.income,
      expenses: r.expenses,
      net: r.income - r.expenses,
    }));

    // ── Recent transactions (10 most recent) ────────────────────────────────
    const recentRows = db.prepare(`
      SELECT * FROM transactions
      ${dateWhere}
      ORDER BY date DESC, created_at DESC
      LIMIT 10
    `).all(...dateParams) as Record<string, unknown>[];

    const recent_transactions = recentRows.map(rowToTransaction);

    return {
      total_income: totals.total_income,
      total_expenses: totals.total_expenses,
      net_balance: totals.total_income - totals.total_expenses,
      transaction_count: totals.transaction_count,
      income_by_category: incomeByCategory,
      expense_by_category: expenseByCategory,
      monthly_trends,
      recent_transactions,
    };
  }
}
