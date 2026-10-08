import { apiClient } from "./client";
import type { Claim, PickupSlot, PaginatedResponse } from "@/types";

export const claimsApi = {
  listClaims: (params?: Record<string, string | number>) =>
    apiClient.get<PaginatedResponse<Claim>>("/claims/", { params }).then((r) => r.data),

  getClaim: (id: number) =>
    apiClient.get<Claim>(`/claims/${id}/`).then((r) => r.data),

  submitClaim: (data: {
    found_item_id: string;
    lost_item_id?: string;
    proof_description: string;
    proof_images?: string[];
  }) => apiClient.post<Claim>("/claims/", data).then((r) => r.data),

  reviewClaim: (id: number, action: "approve" | "reject", rejection_reason?: string) =>
    apiClient.post<Claim>(`/claims/${id}/review/`, { action, rejection_reason }).then((r) => r.data),

  setDelivery: (id: number, data: {
    delivery_method: "pickup" | "courier";
    pickup_slot_id?: number;
    delivery_address?: string;
  }) => apiClient.post<Claim>(`/claims/${id}/delivery/`, data).then((r) => r.data),

  completeClaim: (id: number, delivery_tracking_id?: string) =>
    apiClient.post<Claim>(`/claims/${id}/complete/`, { delivery_tracking_id }).then((r) => r.data),

  cancelClaim: (id: number) =>
    apiClient.post<Claim>(`/claims/${id}/cancel/`).then((r) => r.data),

  listPickupSlots: (venueId: number, date?: string) =>
    apiClient
      .get<PaginatedResponse<PickupSlot>>("/claims/slots/", { params: { venue: venueId, date } })
      .then((r) => r.data),
};
