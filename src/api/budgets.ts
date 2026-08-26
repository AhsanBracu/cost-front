import { api } from "../lib/api";
import type {
  BudgetsResult,
  BudgetSummary,
  CategoryBudget,
  MonthlySpendLimit,
  SetCategoryBudgetInput,
  SetMonthlyLimitInput,
} from "../types";

export const BudgetsApi = {
  get: async (year: number, month: number, member?: string | null): Promise<BudgetsResult> => {
    const res = await api.get("/budgets", { params: { year, month, member } });
    return res.data;
  },

  getSummary: async (year: number, month: number, member?: string | null): Promise<BudgetSummary> => {
    const res = await api.get("/budgets/summary", { params: { year, month, member } });
    return res.data;
  },

  setCategoryBudget: async (data: SetCategoryBudgetInput): Promise<CategoryBudget> => {
    const res = await api.put("/budgets/category", data);
    return res.data.budget;
  },

  removeCategoryBudget: async (id: string): Promise<void> => {
    await api.delete(`/budgets/category/${id}`);
  },

  setMonthlyLimit: async (data: SetMonthlyLimitInput): Promise<MonthlySpendLimit> => {
    const res = await api.put("/budgets/limit", data);
    return res.data.monthlyLimit;
  },

  removeMonthlyLimit: async (year: number, month: number, member?: string | null): Promise<void> => {
    await api.delete("/budgets/limit", { params: { year, month, member } });
  },
};
