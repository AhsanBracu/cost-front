export const CostCategory = {
  Food: "Food",
  Transport: "Transport",
  Housing: "Housing",
  Utilities: "Utilities",
  Entertainment: "Entertainment",
  Health: "Health",
  Shopping: "Shopping",
  Other: "Other",
} as const;
export type CostCategory = (typeof CostCategory)[keyof typeof CostCategory];

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
  category: CostCategory;
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
  category?: CostCategory;
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
  category: CostCategory;
  paymentMethod: PaymentMethod;
  tags?: string[];
  notes?: string;
  receipt?: File | null;
}
