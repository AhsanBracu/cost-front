import { api } from "../lib/api";
import type { Income, IncomeFormInput, IncomeListQuery } from "../types";

export const IncomeApi = {
  list: async (query: IncomeListQuery): Promise<Income[]> => {
    const res = await api.get("/income", { params: query });
    return res.data.incomes;
  },

  create: async (data: IncomeFormInput): Promise<Income> => {
    const res = await api.post("/income", data);
    return res.data.income;
  },

  update: async (id: string, data: Partial<IncomeFormInput>): Promise<Income> => {
    const res = await api.patch(`/income/${id}`, data);
    return res.data.income;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/income/${id}`);
  },
};
