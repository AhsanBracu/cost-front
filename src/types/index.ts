// Categories are user-managed (see CategoriesPage) rather than a fixed
// enum, so a cost's category is just its name. Costs keep the name they
// were saved with even if that category is later renamed or deleted.
export interface Category {
  _id: string;
  user: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryFormInput {
  name: string;
  color: string;
}

export const PaymentMethod = {
  Cash: "Cash",
  Card: "Card",
  BankTransfer: "Bank Transfer",
  MobilePayment: "Mobile Payment",
  Other: "Other",
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export interface User {
  _id: string;
  name: string;
  email: string;
  isVerified: boolean;
}

export interface Cost {
  _id: string;
  user: string;
  amount: number;
  currency: string;
  date: string;
  place?: string;
  description?: string;
  category: string;
  paymentMethod: PaymentMethod;
  receiptUrl?: string;
  tags: string[];
  notes?: string;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CostListResult {
  items: Cost[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CostListQuery {
  page?: number;
  limit?: number;
  sortBy?: "date" | "amount" | "createdAt";
  sortOrder?: "asc" | "desc";
  category?: string;
  paymentMethod?: PaymentMethod;
  place?: string;
  minAmount?: number;
  maxAmount?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface CostFormInput {
  amount: number;
  currency: string;
  date: string;
  place?: string;
  description?: string;
  category: string;
  paymentMethod: PaymentMethod;
  tags?: string[];
  notes?: string;
  receipt?: File | null;
}

export interface ReportQuery {
  startDate?: string;
  endDate?: string;
}

export type ReportInterval = "day" | "week" | "month";

export interface ReportTrendQuery extends ReportQuery {
  interval?: ReportInterval;
}

export interface CurrencyTotal {
  currency: string;
  total: number;
  count: number;
}

export interface CategoryTotal {
  category: string;
  currency: string;
  total: number;
  count: number;
}

export interface PaymentMethodTotal {
  paymentMethod: PaymentMethod;
  currency: string;
  total: number;
  count: number;
}

export interface ReportSummary {
  overall: CurrencyTotal[];
  byCategory: CategoryTotal[];
  byPaymentMethod: PaymentMethodTotal[];
}

export interface TrendPoint {
  period: string;
  currency: string;
  total: number;
  count: number;
}

export interface ReportTrend {
  interval: ReportInterval;
  data: TrendPoint[];
}

export interface CategoryBudget {
  _id: string;
  user: string;
  year: number;
  month: number;
  category: string;
  amount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlySpendLimit {
  _id: string;
  user: string;
  year: number;
  month: number;
  amount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetsResult {
  year: number;
  month: number;
  budgets: CategoryBudget[];
  monthlyLimit: MonthlySpendLimit | null;
}

export interface SetCategoryBudgetInput {
  year: number;
  month: number;
  category: string;
  amount: number;
  currency: string;
}

export interface SetMonthlyLimitInput {
  year: number;
  month: number;
  amount: number;
  currency: string;
}

export interface BudgetSummaryCategory {
  category: string;
  currency: string;
  budgeted: number;
  spent: number;
  remaining: number;
  percentUsed: number | null;
}

export interface BudgetSummaryOverall {
  currency: string;
  limit: number;
  spent: number;
  remaining: number;
  percentUsed: number | null;
  daysRemaining: number;
  dailyPace: number | null;
}

export interface BudgetSummary {
  year: number;
  month: number;
  categories: BudgetSummaryCategory[];
  overall: BudgetSummaryOverall | null;
  warnings: string[];
}

export interface Income {
  _id: string;
  user: string;
  year: number;
  month: number;
  amount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface IncomeListQuery {
  year?: number;
  month?: number;
}

export interface IncomeFormInput {
  year: number;
  month: number;
  amount: number;
  currency: string;
}

export interface SavingsGoal {
  _id: string;
  user: string;
  year: number;
  month: number;
  targetAmount: number;
  currency: string;
  purpose: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavingsGoalListQuery {
  year?: number;
  month?: number;
}

export interface SavingsGoalFormInput {
  year: number;
  month: number;
  targetAmount: number;
  currency: string;
  purpose: string;
}

export interface SavingsSummaryBreakdown {
  currency: string;
  income: number;
  spent: number;
  actualSaved: number;
  goalTotal: number;
  difference: number;
}

export interface SavingsSummary {
  year: number;
  month: number;
  goals: SavingsGoal[];
  breakdown: SavingsSummaryBreakdown[];
}

export interface SavingsTrendQuery {
  startYear: number;
  startMonth: number;
  endYear: number;
  endMonth: number;
}

export interface SavingsTrendMonth {
  year: number;
  month: number;
  breakdown: SavingsSummaryBreakdown[];
}

export interface SavingsTrend {
  data: SavingsTrendMonth[];
}
