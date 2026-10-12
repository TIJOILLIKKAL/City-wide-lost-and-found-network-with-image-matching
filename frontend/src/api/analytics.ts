import { apiClient } from "./client";
import type { AnalyticsOverview, AnalyticsDaily } from "@/types";

export const analyticsApi = {
  getOverview: (days = 30) =>
    apiClient.get<AnalyticsOverview>("/analytics/overview/", { params: { days } }).then((r) => r.data),

  getDaily: (days = 30) =>
    apiClient.get<AnalyticsDaily>("/analytics/daily/", { params: { days } }).then((r) => r.data),
};
