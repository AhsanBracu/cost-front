import { api } from "../lib/api";
import type {
  SavingsGoal,
  SavingsGoalFormInput,
  SavingsGoalListQuery,
  SavingsSummary,
  SavingsTrend,
  SavingsTrendQuery,
} from "../types";

export const SavingsGoalsApi = {
  list: async (query: SavingsGoalListQuery): Promise<SavingsGoal[]> => {
    const res = await api.get("/savings-goals", { params: query });
    return res.data.goals;
  },

  create: async (data: SavingsGoalFormInput): Promise<SavingsGoal> => {
    const res = await api.post("/savings-goals", data);
    return res.data.goal;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/savings-goals/${id}`);
  },

  getSummary: async (year: number, month: number, member?: string | null): Promise<SavingsSummary> => {
    const res = await api.get("/savings-goals/summary", { params: { year, month, member } });
    return res.data;
  },

  getTrend: async (query: SavingsTrendQuery): Promise<SavingsTrend> => {
    const res = await api.get("/savings-goals/trend", { params: query });
    return res.data;
  },
};
