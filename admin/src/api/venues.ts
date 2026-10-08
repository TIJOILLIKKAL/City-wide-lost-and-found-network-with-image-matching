import api from "./client";
import type { VenueListItem, VenueDetail, PagedResponse } from "@/types";

export interface VenueFormData {
  name: string;
  venue_type: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  registration_number?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface VenueTypeOption {
  value: string;
  label: string;
}

export const venuesApi = {
  list: (params?: Record<string, string | number>) =>
    api
      .get<PagedResponse<VenueListItem>>("/api/v1/admin/venues/", { params })
      .then((r) => r.data),

  types: () =>
    api.get<VenueTypeOption[]>("/api/v1/admin/venues/types/").then((r) => r.data),

  get: (slug: string) =>
    api.get<VenueDetail>(`/api/v1/admin/venues/${slug}/`).then((r) => r.data),

  create: (data: VenueFormData) =>
    api.post<VenueDetail>("/api/v1/admin/venues/", data).then((r) => r.data),

  update: (slug: string, data: Partial<VenueFormData>) =>
    api.patch<VenueDetail>(`/api/v1/admin/venues/${slug}/`, data).then((r) => r.data),

  remove: (slug: string) => api.delete(`/api/v1/admin/venues/${slug}/`),

  activate: (slug: string) =>
    api.post<VenueDetail>(`/api/v1/admin/venues/${slug}/activate/`).then((r) => r.data),

  deactivate: (slug: string) =>
    api.post<VenueDetail>(`/api/v1/admin/venues/${slug}/deactivate/`).then((r) => r.data),
};
