import { api } from "../lib/api";
import type { Cost, CostFormInput, CostListQuery, CostListResult } from "../types";

const buildFormData = (data: Partial<CostFormInput>) => {
  const formData = new FormData();
  if (data.amount !== undefined) formData.append("amount", String(data.amount));
  if (data.currency !== undefined) formData.append("currency", data.currency);
  if (data.date !== undefined) formData.append("date", data.date);
  if (data.place) formData.append("place", data.place);
  if (data.description) formData.append("description", data.description);
  if (data.category !== undefined) formData.append("category", data.category);
  if (data.paymentMethod !== undefined) formData.append("paymentMethod", data.paymentMethod);
  if (data.notes) formData.append("notes", data.notes);
  if (data.tags?.length) formData.append("tags", data.tags.join(","));
  if (data.receipt) formData.append("receipt", data.receipt);
  return formData;
};

export const CostsApi = {
  list: async (query: CostListQuery): Promise<CostListResult> => {
    const res = await api.get("/costs", { params: query });
    return res.data;
  },

  get: async (id: string): Promise<Cost> => {
    const res = await api.get(`/costs/${id}`);
    return res.data.cost;
  },

  create: async (data: CostFormInput): Promise<Cost> => {
    const res = await api.post("/costs", buildFormData(data), {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.cost;
  },

  update: async (id: string, data: Partial<CostFormInput>): Promise<Cost> => {
    const res = await api.patch(`/costs/${id}`, buildFormData(data), {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.cost;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/costs/${id}`);
  },
};
