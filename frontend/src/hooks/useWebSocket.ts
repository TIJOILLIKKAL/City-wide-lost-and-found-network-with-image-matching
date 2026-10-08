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
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    function connect() {
      const token = tokenStorage.getAccess();
      if (!token) return;

      // Pass JWT as query param — Channels reads it via token auth middleware
      const ws = new WebSocket(`${WS_URL}?token=${token}`);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WsEvent;
          addNotification(data);
        } catch {
          // ignore malformed frames
        }
      };

      ws.onclose = (event) => {
        if (event.code !== 4001) {
          // Auto-reconnect unless closed due to auth failure
          reconnectRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
        }
      };
    }

    connect();

    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [isAuthenticated, addNotification]);
}
