import { api } from "../lib/api";
import type { ReportQuery, ReportSummary, ReportTrend, ReportTrendQuery } from "../types";

export const ReportsApi = {
  getSummary: async (query: ReportQuery): Promise<ReportSummary> => {
    const res = await api.get("/costs/reports/summary", { params: query });
    return res.data;
  },

  getTrend: async (query: ReportTrendQuery): Promise<ReportTrend> => {
    const res = await api.get("/costs/reports/trend", { params: query });
    return res.data;
  },
};
