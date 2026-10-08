// ─── Auth ─────────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "venue_staff" | "owner";

export interface User {
  id: number;
  email: string;
  full_name: string;
  phone: string;
  role: UserRole;
  venue_id: number | null;
  is_active: boolean;
  date_joined: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  password2: string;
  full_name: string;
  phone?: string;
  role?: UserRole;
}

export interface AuthResponse {
  user: User;
  access: string;
  refresh: string;
}

// ─── Venues ───────────────────────────────────────────────────────────────────

export type VenueType =
  | "mall"
  | "metro_station"
  | "bus_station"
  | "airport"
  | "taxi_service"
  | "hotel"
  | "hospital"
  | "university"
  | "other";

export type VenueStatus = "active" | "inactive" | "pending";

export interface Venue {
  id: number;
  name: string;
  venue_type: VenueType;
  status: VenueStatus;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  contact_email: string;
  contact_phone: string;
  created_at: string;
}

// ─── Items ────────────────────────────────────────────────────────────────────

export type ItemCategory =
  | "electronics"
  | "clothing"
  | "accessories"
  | "documents"
  | "keys"
  | "bags"
  | "wallet"
  | "jewellery"
  | "toys"
  | "sports"
  | "other";

export type EmbeddingStatus = "pending" | "done" | "failed" | "skipped";
export type FoundItemStatus = "available" | "claimed" | "returned";
export type LostItemStatus = "searching" | "found" | "closed";

export interface FoundItem {
  id: string;
  item_type: "found";
  venue_id: number;
  reported_by: number;
  title: string;
  description: string;
  category: ItemCategory;
  color: string;
  brand: string;
  image_url: string;
  found_at: string;
  found_location: string;
  status: FoundItemStatus;
  embedding_status: EmbeddingStatus;
  created_at: string;
}

export interface LostItem {
  id: string;
  item_type: "lost";
  reported_by: number;
  title: string;
  description: string;
  category: ItemCategory;
  color: string;
  brand: string;
  image_url: string;
  lost_at: string;
  lost_location: string;
  status: LostItemStatus;
  embedding_status: EmbeddingStatus;
  created_at: string;
}

// ─── Matching ─────────────────────────────────────────────────────────────────

export interface MatchResult {
  item_id: string;
  title: string;
  description: string;
  category: string;
  venue_id: string;
  status: string;
  score: number;
  reported_at: string;
}

// ─── Claims ───────────────────────────────────────────────────────────────────

export type ClaimStatus =
  | "pending"
  | "under_review"
  | "approved"
  | "rejected"
  | "pickup_scheduled"
  | "out_for_delivery"
  | "completed"
  | "cancelled";

export type DeliveryMethod = "pickup" | "courier";

export interface Claim {
  id: number;
  found_item_id: string;
  lost_item_id: string;
  claimant: User;
  venue: Venue;
  status: ClaimStatus;
  proof_description: string;
  proof_images: string[];
  rejection_reason: string;
  delivery_method: DeliveryMethod | null;
  delivery_address: string;
  delivery_tracking_id: string;
  reviewed_by: User | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PickupSlot {
  id: number;
  venue: number;
  date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  booked_count: number;
  slots_remaining: number;
  is_available: boolean;
}

// ─── API response wrappers ────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiError {
  detail?: string;
  status_code?: number;
  [field: string]: unknown;
}

// ─── WebSocket notifications ──────────────────────────────────────────────────

export interface WsMatchEvent {
  type: "match";
  item_id: string;
  item_type: "found" | "lost";
  match_count: number;
}

export interface WsClaimStatusEvent {
  type: "claim_status";
  claim_id: number;
  status: ClaimStatus;
}

export interface WsNewClaimEvent {
  type: "new_claim";
  claim_id: number;
  venue_id: number;
}

export type WsEvent = WsMatchEvent | WsClaimStatusEvent | WsNewClaimEvent;
