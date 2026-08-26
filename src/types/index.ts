// Categories are user-managed (see CategoriesPage) rather than a fixed
// enum, so a cost's category is just its name. Costs keep the name they
// were saved with even if that category is later renamed or deleted.
export interface Category {
  _id: string;
  family: string;
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

export interface Family {
  _id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyMember {
  _id: string;
  name: string;
  email: string;
  isVerified: boolean;
}

export interface FamilyInvite {
  _id: string;
  email: string;
  createdAt: string;
  expiresAt: string;
}

export interface FamilyResult {
  family: Family | null;
  members: FamilyMember[];
  pendingInvites: FamilyInvite[];
}

export interface ActivityLogEntry {
  _id: string;
  actor: FamilyMember;
  action: "created" | "updated" | "deleted" | "restored";
  entity: string;
  entityId?: string;
  summary: string;
  createdAt: string;
}

export interface ActivityLogResult {
  items: ActivityLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Cost {
  _id: string;
  family: string;
  createdBy: string;
  /** Whose money went out. */
  paidBy: string;
  /** Who it was for; null means a shared household cost. */
  forWhom: string | null;
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
  paidBy?: string;
  /** A member id, or "shared" for household costs. */
  forWhom?: string;
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
  paidBy?: string;
  /** A member id, or "shared" for household costs. */
  forWhom?: string;
}

export interface ReportQuery {
  paidBy?: string;
  forWhom?: string;
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

/** A null memberId is the shared/household bucket, rendered as "Shared". */
export interface PersonTotal {
  memberId: string | null;
  name: string;
  currency: string;
  total: number;
  count: number;
}

export interface ReportSummary {
  overall: CurrencyTotal[];
  byCategory: CategoryTotal[];
  byPaymentMethod: PaymentMethodTotal[];
  /** How much was spent on each person. */
  byPerson: PersonTotal[];
  /** How much each person paid out. */
  byPayer: PersonTotal[];
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
  family: string;
  /** null means the household-wide budget. */
  member: string | null;
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
  family: string;
  member: string | null;
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
  member: string | null;
  budgets: CategoryBudget[];
  monthlyLimit: MonthlySpendLimit | null;
}

export interface SetCategoryBudgetInput {
  /** A member id, or "household"/null for the household budget. */
  member?: string | null;
  year: number;
  month: number;
  category: string;
  amount: number;
  currency: string;
}

export interface SetMonthlyLimitInput {
  member?: string | null;
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
  member: string | null;
  categories: BudgetSummaryCategory[];
  overall: BudgetSummaryOverall | null;
  warnings: string[];
}

export interface Income {
  _id: string;
  family: string;
  createdBy: string;
  earnedBy: FamilyMember | string;
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
  earnedBy?: string;
}

export interface IncomeFormInput {
  earnedBy?: string;
  year: number;
  month: number;
  amount: number;
  currency: string;
}

export interface SavingsGoal {
  _id: string;
  family: string;
  createdBy: string;
  member: FamilyMember | string | null;
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
  member?: string | null;
}

export interface SavingsGoalFormInput {
  member?: string | null;
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
  member?: string | null;
}

export interface SavingsTrendMonth {
  year: number;
  month: number;
  breakdown: SavingsSummaryBreakdown[];
}

export interface SavingsTrend {
  data: SavingsTrendMonth[];
}
