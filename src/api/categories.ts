import { api } from "../lib/api";
import type { Category, CategoryFormInput } from "../types";

export const CategoriesApi = {
  list: async (): Promise<Category[]> => {
    const res = await api.get("/categories");
    return res.data.categories;
  },

  create: async (data: CategoryFormInput): Promise<Category> => {
    const res = await api.post("/categories", data);
    return res.data.category;
  },

  update: async (id: string, data: Partial<CategoryFormInput>): Promise<Category> => {
    const res = await api.patch(`/categories/${id}`, data);
    return res.data.category;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/categories/${id}`);
  },
};
