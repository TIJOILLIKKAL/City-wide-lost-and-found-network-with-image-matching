import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/store/auth";

export function AuthGuard() {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-500 mt-2">This panel is restricted to administrators.</p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
