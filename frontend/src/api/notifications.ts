import { apiClient } from "./client";

export interface ApiNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export const notificationsApi = {
  list: () =>
    apiClient
      .get<{ results: ApiNotification[]; unread_count: number }>("/notifications/")
      .then((r) => r.data),

  markRead: (ids?: number[]) =>
    apiClient.post("/notifications/mark-read/", ids ? { ids } : {}),
};
