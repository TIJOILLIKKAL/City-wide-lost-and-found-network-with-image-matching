import { Link, useNavigate } from "react-router-dom";
import { Bell, LogOut, MapPin, Package, Search, ClipboardList, LayoutDashboard, UserCircle, MessageSquare, BarChart3, ShieldAlert, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore, useUser, useIsVenueStaff, useIsAdmin } from "@/store/authStore";
import { useNotificationStore } from "@/store/notificationStore";

export function Navbar() {
  const user = useUser();
  const isVenueStaff = useIsVenueStaff();
  const isAdmin = useIsAdmin();
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2 font-bold text-lg text-primary">
          <MapPin className="h-5 w-5" />
          LostFound City
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <NavLink to="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />} label="Dashboard" />
          <NavLink to="/items/found" icon={<Package className="h-4 w-4" />} label={isVenueStaff ? "Found Items" : "Browse Found"} />
          {!isVenueStaff && (
            <NavLink to="/items/lost" icon={<Package className="h-4 w-4" />} label="My Lost Items" />
          )}
          <NavLink to="/search" icon={<Search className="h-4 w-4" />} label="Search" />
          <NavLink to="/claims" icon={<ClipboardList className="h-4 w-4" />} label="Claims" />
          <NavLink to="/chat" icon={<MessageSquare className="h-4 w-4" />} label="Chats" />
          {isVenueStaff && (
            <NavLink to="/items/found/bulk" icon={<Upload className="h-4 w-4" />} label="Bulk Upload" />
          )}
          {isAdmin && (
            <NavLink to="/admin/disputes" icon={<ShieldAlert className="h-4 w-4" />} label="Disputes" />
          )}
          {isAdmin && (
            <NavLink to="/analytics" icon={<BarChart3 className="h-4 w-4" />} label="Analytics" />
          )}
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild className="relative">
            <Link to="/notifications">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              )}
            </Link>
          </Button>

          <Button variant="ghost" size="icon" asChild title="Profile">
            <Link to="/profile">
              <UserCircle className="h-5 w-5" />
            </Link>
          </Button>

          <span className="hidden md:block text-sm text-muted-foreground">
            {user?.full_name}
          </span>

          <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}

function NavLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
    >
      {icon}
      {label}
    </Link>
  );
}
