import { create } from "zustand";
import type { WsEvent } from "@/types";

interface Notification {
  id: string;
  event: WsEvent;
  read: boolean;
  timestamp: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (event: WsEvent) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (event) => {
    const notification: Notification = {
      id: `${Date.now()}-${Math.random()}`,
      event,
      read: false,
      timestamp: new Date().toISOString(),
    };
    set((state) => ({
      notifications: [notification, ...state.notifications].slice(0, 50),
      unreadCount: state.unreadCount + 1,
    }));
  },

  markRead: (id) =>
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      return { notifications: updated, unreadCount: updated.filter((n) => !n.read).length };
    }),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),
}));
