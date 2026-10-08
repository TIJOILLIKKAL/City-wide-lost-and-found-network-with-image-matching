import api from "./client";
import type { FoundItem, LostItem, MongoPagedResponse } from "@/types";

export const itemsApi = {
  listFound: (params?: Record<string, string | number>) =>
    api
      .get<MongoPagedResponse<FoundItem>>("/api/v1/admin/found-items/", { params })
      .then((r) => r.data),

  getFound: (id: string) =>
    api.get<FoundItem>(`/api/v1/admin/found-items/${id}/`).then((r) => r.data),

  updateFound: (id: string, data: Partial<Pick<FoundItem, "status" | "title" | "description" | "category">>) =>
    api.patch<FoundItem>(`/api/v1/admin/found-items/${id}/`, data).then((r) => r.data),

  listLost: (params?: Record<string, string | number>) =>
    api
      .get<MongoPagedResponse<LostItem>>("/api/v1/admin/lost-items/", { params })
      .then((r) => r.data),

  getLost: (id: string) =>
    api.get<LostItem>(`/api/v1/admin/lost-items/${id}/`).then((r) => r.data),
};
