import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";
import { useWebSocket } from "@/hooks/useWebSocket";

export function AppLayout() {
  useWebSocket();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container py-6">
        <Outlet />
      </main>
    </div>
  );
}
