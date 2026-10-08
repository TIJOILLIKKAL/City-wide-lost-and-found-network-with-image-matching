import api from "./client";
import type { Claim, PagedResponse } from "@/types";

export const claimsApi = {
  list: (params?: Record<string, string>) =>
    api
      .get<PagedResponse<Claim>>("/api/v1/admin/claims/", { params })
      .then((r) => r.data),

  get: (id: number) =>
    api.get<Claim>(`/api/v1/admin/claims/${id}/`).then((r) => r.data),

  review: (id: number, action: "approve" | "reject", rejection_reason?: string) =>
    api
      .post<Claim>(`/api/v1/admin/claims/${id}/review/`, { action, rejection_reason })
      .then((r) => r.data),

  complete: (id: number, tracking_id?: string) =>
    api
      .post<Claim>(`/api/v1/admin/claims/${id}/complete/`, { tracking_id })
      .then((r) => r.data),

  cancel: (id: number) =>
    api.post<Claim>(`/api/v1/admin/claims/${id}/cancel/`).then((r) => r.data),
};
