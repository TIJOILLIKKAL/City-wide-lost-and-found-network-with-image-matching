import { create } from "zustand";
import type { WsEvent } from "@/types";

interface Notification {
  id: string;
  event: WsEvent;
  read: boolean;
  timestamp: string;
}

interface ChatUnread {
  roomId: number;
  claimId: number;
  senderName: string;
  text: string;
  createdAt: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  // per-room unread chat messages (roomId → array of previews)
  chatUnreads: Record<number, ChatUnread[]>;

  addNotification: (event: WsEvent) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
  setUnreadCount: (count: number) => void;
  addChatUnread: (msg: ChatUnread) => void;
  clearChatUnread: (roomId: number) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  chatUnreads: {},

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

  setUnreadCount: (count) => set({ unreadCount: count }),

  addChatUnread: (msg) =>
    set((state) => ({
      chatUnreads: {
        ...state.chatUnreads,
        [msg.roomId]: [...(state.chatUnreads[msg.roomId] ?? []), msg].slice(-20),
      },
    })),

  clearChatUnread: (roomId) =>
    set((state) => {
      const next = { ...state.chatUnreads };
      delete next[roomId];
      return { chatUnreads: next };
    }),
}));
