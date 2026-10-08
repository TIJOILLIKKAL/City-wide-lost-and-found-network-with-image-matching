import api from "./client";
import type { AdminUser, PagedResponse } from "@/types";

export const usersApi = {
  list: (params?: Record<string, string>) =>
    api
      .get<PagedResponse<AdminUser>>("/api/v1/admin/users/", { params })
      .then((r) => r.data),

  get: (id: number) =>
    api.get<AdminUser>(`/api/v1/admin/users/${id}/`).then((r) => r.data),

  update: (
    id: number,
    data: Partial<Pick<AdminUser, "role" | "is_active" | "is_verified" | "venue">>
  ) => api.patch<AdminUser>(`/api/v1/admin/users/${id}/`, data).then((r) => r.data),

  remove: (id: number) => api.delete(`/api/v1/admin/users/${id}/`),
};
