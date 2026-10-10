import { apiClient } from "./client";

export interface ChatMessage {
  id: number;
  sender_id: number;
  sender_name: string;
  text: string;
  created_at: string;
}

export interface FoundItemSnapshot {
  id: string;
  title: string;
  category: string;
  color: string;
  image_url: string;
  found_location: string;
  found_at: string;
}

export interface ChatRoom {
  id: number;
  claim_id: number;
  claim_status: string;
  found_item_id: string;
  claimant_id: number;
  claimant_name: string;
  claimant_email: string;
  claimant_phone: string;
  venue_name: string;
  messages: ChatMessage[];
  created_at: string;
}

export interface ChatRoomSummary {
  id: number;
  claim_id: number;
  claim_status: string;
  found_item_id: string;
  claimant_name: string;
  claimant_email: string;
  venue_name: string;
  last_message: { text: string; sender_name: string; created_at: string } | null;
  message_count: number;
  created_at: string;
  found_item: FoundItemSnapshot | null;
}

export const chatApi = {
  listRooms: () =>
    apiClient
      .get<{ results: ChatRoomSummary[]; count: number }>("/chat/rooms/")
      .then((r) => r.data),

  getOrCreateRoom: (claimId: number) =>
    apiClient.get<ChatRoom>(`/chat/claim/${claimId}/`).then((r) => r.data),

  getHistory: (roomId: number, before?: number) =>
    apiClient
      .get<{ room_id: number; results: ChatMessage[] }>(
        `/chat/room/${roomId}/messages/`,
        { params: before ? { before } : {} }
      )
      .then((r) => r.data),

  getPresence: (roomId: number) =>
    apiClient
      .get<{ room_id: number; online_ids: number[] }>(`/chat/room/${roomId}/presence/`)
      .then((r) => r.data),
};
