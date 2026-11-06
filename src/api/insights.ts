import { api } from "../lib/api";
import type { DailyInsight } from "../types";

export const InsightsApi = {
  /** Reads the stored explanation. Never calls the model, so it's cheap. */
  getDaily: async (date?: string): Promise<DailyInsight> => {
    const res = await api.get("/insights/daily/explained", { params: { date } });
    return res.data;
  },

  /** Generates one -- the button. Takes several seconds and costs money. */
  generateDaily: async (date?: string): Promise<DailyInsight> => {
    const res = await api.post("/insights/daily/explained", null, { params: { date } });
    return res.data;
  },
};
