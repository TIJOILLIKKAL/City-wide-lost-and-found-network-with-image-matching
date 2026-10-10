import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useIsAuthenticated } from "@/store/authStore";
import { useNotificationStore } from "@/store/notificationStore";
import { notificationsApi } from "@/api/notifications";

export function AppLayout() {
  useWebSocket();

  const isAuthenticated = useIsAuthenticated();
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);

  useEffect(() => {
    if (!isAuthenticated) return;
    notificationsApi.list().then((data) => setUnreadCount(data.unread_count)).catch(() => {});
  }, [isAuthenticated, setUnreadCount]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container py-6">
        <Outlet />
      </main>
    </div>
  );
}
