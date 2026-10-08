import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Building2,
  PackageSearch,
  PackageOpen,
  ClipboardList,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { authApi } from "@/api/auth";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/users", label: "Users", icon: Users },
  { to: "/venues", label: "Venues", icon: Building2 },
  { to: "/found-items", label: "Found Items", icon: PackageSearch },
  { to: "/lost-items", label: "Lost Items", icon: PackageOpen },
  { to: "/claims", label: "Claims", icon: ClipboardList },
];

export function Sidebar() {
  const { user, refreshToken, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } finally {
      logout();
      navigate("/login");
    }
  };

  return (
    <aside className="w-60 bg-slate-900 flex flex-col fixed inset-y-0 z-30">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-700/60">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">LostFound</p>
            <p className="text-slate-400 text-xs mt-0.5">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="px-3 py-3 border-t border-slate-700/60 space-y-2">
        {user && (
          <div className="px-3 py-2">
            <p className="text-white text-xs font-medium truncate">{user.full_name}</p>
            <p className="text-slate-400 text-xs truncate">{user.email}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
