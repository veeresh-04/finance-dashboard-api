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
  async getSummary(dateFrom?: string, dateTo?: string): Promise<DashboardSummary> {
    const db = getDb();

    const dateConditions: string[] = ['is_deleted = FALSE'];
    const dateParams: unknown[] = [];

    if (dateFrom) { dateConditions.push(`date >= $${dateParams.length + 1}`); dateParams.push(dateFrom); }
    if (dateTo)   { dateConditions.push(`date <= $${dateParams.length + 1}`); dateParams.push(dateTo); }

    const dateWhere = `WHERE ${dateConditions.join(' AND ')}`;
    const trendConditions = [...dateConditions];
    const trendParams = [...dateParams];

    if (!dateFrom && !dateTo) {
      trendConditions.push("date >= CURRENT_DATE - INTERVAL '12 months'");
    }

    const trendWhere = `WHERE ${trendConditions.join(' AND ')}`;

    // ── Totals ──────────────────────────────────────────────────────────────
    const totalsResult = await db.query(`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END), 0) AS total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expenses,
        COUNT(*)::int AS transaction_count
      FROM transactions
      ${dateWhere}
    `, dateParams);
    const totals = totalsResult.rows[0] as {
      total_income: number;
      total_expenses: number;
      transaction_count: number;
    };

    // ── Category breakdowns ──────────────────────────────────────────────────
    const incomeByCategoryResult = await db.query(`
      SELECT category, SUM(amount) AS total, COUNT(*)::int AS count
      FROM transactions
      ${dateWhere} AND type = 'income'
      GROUP BY category
      ORDER BY total DESC
    `, dateParams);
    const incomeByCategory = incomeByCategoryResult.rows as CategoryTotal[];

    const expenseByCategoryResult = await db.query(`
      SELECT category, SUM(amount) AS total, COUNT(*)::int AS count
      FROM transactions
      ${dateWhere} AND type = 'expense'
      GROUP BY category
      ORDER BY total DESC
    `, dateParams);
    const expenseByCategory = expenseByCategoryResult.rows as CategoryTotal[];

    // ── Monthly trends (last 12 months) ─────────────────────────────────────
    const monthlyRawResult = await db.query(`
      SELECT
        EXTRACT(YEAR FROM date)::int AS year_num,
        EXTRACT(MONTH FROM date)::int AS month_num,
        COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expenses
      FROM transactions
      ${trendWhere}
      GROUP BY year_num, month_num
      ORDER BY year_num ASC, month_num ASC
    `, trendParams);
    const monthlyRaw = monthlyRawResult.rows as {
      year_num: number;
      month_num: number;
      income: number;
      expenses: number;
    }[];

    const monthly_trends: MonthlyTrend[] = monthlyRaw.map((r) => ({
      month: `${r.year_num}-${String(r.month_num).padStart(2, '0')}`,
      income: r.income,
      expenses: r.expenses,
      net: r.income - r.expenses,
    }));

    // ── Recent transactions (10 most recent) ────────────────────────────────
    const recentRowsResult = await db.query(`
      SELECT * FROM transactions
      ${dateWhere}
      ORDER BY date DESC, created_at DESC
      LIMIT 10
    `, dateParams);
    const recentRows = recentRowsResult.rows as Record<string, unknown>[];

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
