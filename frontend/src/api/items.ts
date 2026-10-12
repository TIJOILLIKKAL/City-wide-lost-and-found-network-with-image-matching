import { apiClient } from "./client";
import type { FoundItem, LostItem, PaginatedResponse } from "@/types";

export const itemsApi = {
  listFoundItems: (params?: Record<string, string | number>) =>
    apiClient.get<PaginatedResponse<FoundItem>>("/items/found/", { params }).then((r) => r.data),

  getFoundItem: (id: string) =>
    apiClient.get<FoundItem>(`/items/found/${id}/`).then((r) => r.data),

  createFoundItem: (formData: FormData) =>
    apiClient.post<FoundItem>("/items/found/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data),

  listLostItems: (params?: Record<string, string | number>) =>
    apiClient.get<PaginatedResponse<LostItem>>("/items/lost/", { params }).then((r) => r.data),

  getLostItem: (id: string) =>
    apiClient.get<LostItem>(`/items/lost/${id}/`).then((r) => r.data),

  createLostItem: (formData: FormData) =>
    apiClient.post<LostItem>("/items/lost/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data),

  updateLostItem: (id: string, formData: FormData) =>
    apiClient.patch<LostItem>(`/items/lost/${id}/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data),

  deleteLostItem: (id: string) =>
    apiClient.delete(`/items/lost/${id}/`),

  bulkUploadFoundItems: (csvFile: File) => {
    const fd = new FormData();
    fd.append("file", csvFile);
    return apiClient.post<{
      created: number;
      error_count: number;
      total_rows: number;
      errors: { row: number; errors: string[] }[];
    }>("/items/found/bulk/", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
  },
};
