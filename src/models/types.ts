// ─── Roles ───────────────────────────────────────────────────────────────────

export enum Role {
  VIEWER = 'viewer',
  ANALYST = 'analyst',
  ADMIN = 'admin',
}

// Role hierarchy: higher index = more permissions
export const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.VIEWER]: 0,
  [Role.ANALYST]: 1,
  [Role.ADMIN]: 2,
};

// ─── Users ───────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserPublic {
  id: string;
  name: string;
  email: string;
  role: Role;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateUserDTO {
  name: string;
  email: string;
  password: string;
  role?: Role;
}

export interface UpdateUserDTO {
  name?: string;
  email?: string;
  role?: Role;
  is_active?: boolean;
}

// ─── Financial Records ────────────────────────────────────────────────────────

export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
}

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string; // ISO date string YYYY-MM-DD
  notes: string | null;
  created_by: string; // user id
  is_deleted: boolean; // soft delete
  created_at: string;
  updated_at: string;
}

export interface CreateTransactionDTO {
  amount: number;
  type: TransactionType;
  category: string;
  date: string;
  notes?: string;
}

export interface UpdateTransactionDTO {
  amount?: number;
  type?: TransactionType;
  category?: string;
  date?: string;
  notes?: string;
}

export interface TransactionFilters {
  type?: TransactionType;
  category?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthPayload {
  userId: string;
  role: Role;
}

export interface AuthResponse {
  token: string;
  user: UserPublic;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface CategoryTotal {
  category: string;
  total: number;
  count: number;
}

export interface MonthlyTrend {
  month: string; // YYYY-MM
  income: number;
  expenses: number;
  net: number;
}

export interface DashboardSummary {
  total_income: number;
  total_expenses: number;
  net_balance: number;
  transaction_count: number;
  income_by_category: CategoryTotal[];
  expense_by_category: CategoryTotal[];
  monthly_trends: MonthlyTrend[];
  recent_transactions: Transaction[];
}

// ─── API Responses ────────────────────────────────────────────────────────────

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export interface ApiError {
  error: string;
  message: string;
  details?: unknown;
}