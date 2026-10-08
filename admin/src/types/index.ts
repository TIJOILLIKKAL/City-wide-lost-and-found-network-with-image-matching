export type UserRole = "admin" | "venue_staff" | "owner";

export interface AuthUser {
  id: number;
  email: string;
  full_name: string;
  phone: string;
  role: UserRole;
  is_verified: boolean;
  created_at: string;
}

export interface AdminUser {
  id: number;
  email: string;
  full_name: string;
  phone: string;
  role: UserRole;
  venue: number | null;
  venue_name: string | null;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

export interface VenueListItem {
  id: number;
  name: string;
  slug: string;
  venue_type: string;
  status: "active" | "inactive" | "suspended";
  city: string;
  state: string;
  contact_phone: string;
  staff_count: number;
  created_at: string;
}

export interface VenueDetail extends VenueListItem {
  address: string;
  pincode: string;
  latitude: number | null;
  longitude: number | null;
  contact_name: string;
  contact_email: string;
  registration_number: string;
  updated_at: string;
}

export interface FoundItem {
  id: string;
  title: string;
  description: string;
  category: string;
  color: string;
  brand: string;
  image_url: string;
  status: "available" | "claimed" | "archived";
  venue_id: number;
  reported_by: number;
  found_at: string;
  found_location: string;
  embedding_status: string;
  created_at: string;
  updated_at: string;
}

export interface LostItem {
  id: string;
  title: string;
  description: string;
  category: string;
  color: string;
  brand: string;
  image_url: string;
  status: "searching" | "matched" | "resolved";
  reported_by: number;
  lost_at: string;
  lost_location: string;
  created_at: string;
}

export interface Claim {
  id: number;
  found_item_id: string;
  lost_item_id: string;
  claimant: number;
  claimant_email: string;
  claimant_name: string;
  venue: number;
  venue_name: string;
  status: string;
  proof_description: string;
  delivery_method: string | null;
  delivery_address: string;
  delivery_tracking_id: string;
  rejection_reason: string;
  reviewed_by: number | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminStats {
  users: { total: number; by_role: Record<string, number> };
  venues: { total: number; by_status: Record<string, number> };
  items: { found: number; lost: number };
  claims: { total: number; by_status: Record<string, number> };
}

export interface PagedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface MongoPagedResponse<T> {
  count: number;
  page: number;
  total_pages: number;
  results: T[];
}
