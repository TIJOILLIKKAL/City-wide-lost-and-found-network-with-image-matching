import { useEffect, useRef } from "react";
import { useIsAuthenticated } from "@/store/authStore";
import { useNotificationStore } from "@/store/notificationStore";
import { tokenStorage } from "@/api/client";
import type { WsEvent } from "@/types";

const WS_URL = `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws/notifications/`;
const RECONNECT_DELAY_MS = 3000;

export function useWebSocket() {
  const isAuthenticated = useIsAuthenticated();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const addChatUnread = useNotificationStore((s) => s.addChatUnread);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    mountedRef.current = true;

    function connect() {
      if (!mountedRef.current) return;
      const token = tokenStorage.getAccess();
      if (!token) return;

      const ws = new WebSocket(`${WS_URL}?token=${token}`);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WsEvent & {
            type: string; room_id?: number; claim_id?: number;
            sender_id?: number; sender_name?: string; text?: string; created_at?: string;
          };

          if (data.type === "chat_message" && data.room_id) {
            // Route to chat unread store; don't pollute the notification bell
            addChatUnread({
              roomId: data.room_id,
              claimId: data.claim_id ?? 0,
              senderName: data.sender_name ?? "",
              text: data.text ?? "",
              createdAt: data.created_at ?? new Date().toISOString(),
            });
          } else {
            addNotification(data as WsEvent);
          }
        } catch {
          // ignore malformed frames
        }
      };

      ws.onclose = (event) => {
        if (!mountedRef.current) return;
        if (event.code !== 4001) {
          reconnectRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
        }
      };
    }

    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      const ws = wsRef.current;
      if (!ws) return;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      } else if (ws.readyState === WebSocket.CONNECTING) {
        ws.onopen = () => ws.close();
      }
      wsRef.current = null;
    };
  }, [isAuthenticated, addNotification, addChatUnread]);
}
