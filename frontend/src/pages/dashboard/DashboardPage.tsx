import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Package, Search, ClipboardList, MapPin, TrendingUp, Clock, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUser, useIsVenueStaff } from "@/store/authStore";
import { itemsApi } from "@/api/items";
import { claimsApi } from "@/api/claims";

export function DashboardPage() {
  const user = useUser();
  const isVenueStaff = useIsVenueStaff();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome, {user?.full_name}</h1>
        <p className="text-muted-foreground mt-1">
          {isVenueStaff
            ? "Manage found items and review claims for your venue."
            : "Track your lost items and manage your claims."}
        </p>
      </div>

      {isVenueStaff ? <StaffDashboard /> : <OwnerDashboard />}
    </div>
  );
}

function StaffDashboard() {
  const { data: foundItems } = useQuery({
    queryKey: ["found-items"],
    queryFn: () => itemsApi.listFoundItems({ limit: 5 }),
  });

  const { data: claims } = useQuery({
    queryKey: ["claims", "pending"],
    queryFn: () => claimsApi.listClaims({ status: "pending" }),
  });

  return (
    <div className="space-y-6">
      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        <QuickAction
          to="/items/found/new"
          icon={<Package className="h-5 w-5" />}
          title="Upload Found Item"
          description="Log a new found item with photo"
          variant="primary"
        />
        <QuickAction
          to="/claims"
          icon={<ClipboardList className="h-5 w-5" />}
          title="Review Claims"
          description={`${claims?.count ?? 0} pending`}
          badge={claims?.count}
        />
        <QuickAction
          to="/search"
          icon={<Search className="h-5 w-5" />}
          title="Search Items"
          description="AI image and text search"
        />
      </div>

      {/* Recent found items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Found Items</CardTitle>
            <CardDescription>Last 5 items logged at your venue</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/items/found">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {foundItems?.results.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No items yet.</p>
          )}
          <div className="space-y-3">
            {foundItems?.results.map((item) => (
              <div key={item._id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-3">
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="h-10 w-10 rounded object-cover bg-muted"
                    />
                  )}
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.category} · {new Date(item.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <Badge variant={item.status === "available" ? "success" : "secondary"}>
                  {item.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function OwnerDashboard() {
  const { data: lostItems } = useQuery({
    queryKey: ["lost-items"],
    queryFn: () => itemsApi.listLostItems({ limit: 5 }),
  });

  const { data: claims } = useQuery({
    queryKey: ["my-claims"],
    queryFn: () => claimsApi.listClaims({ limit: 5 }),
  });

  const activeClaims = claims?.results.filter(
    (c) => !["completed", "cancelled"].includes(c.status)
  ) ?? [];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={<Clock className="h-5 w-5 text-yellow-500" />} label="Searching" value={lostItems?.results.filter(i => i.status === "searching").length ?? 0} />
        <StatCard icon={<TrendingUp className="h-5 w-5 text-blue-500" />} label="Active Claims" value={activeClaims.length} />
        <StatCard icon={<CheckCircle className="h-5 w-5 text-green-500" />} label="Recovered" value={lostItems?.results.filter(i => i.status === "found").length ?? 0} />
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-2">
        <QuickAction
          to="/items/lost/new"
          icon={<MapPin className="h-5 w-5" />}
          title="Report Lost Item"
          description="Upload a photo and description"
          variant="primary"
        />
        <QuickAction
          to="/search"
          icon={<Search className="h-5 w-5" />}
          title="Search Found Items"
          description="AI-powered image & text search"
        />
      </div>

      {/* Recent lost items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>My Lost Items</CardTitle>
            <CardDescription>Track your reported items</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/items/lost">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {lostItems?.results.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nothing reported yet.{" "}
              <Link to="/items/lost/new" className="text-primary hover:underline">
                Report a lost item
              </Link>
            </p>
          )}
          <div className="space-y-3">
            {lostItems?.results.map((item) => (
              <div key={item._id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.category} · Lost {new Date(item.lost_at).toLocaleDateString()}</p>
                </div>
                <Badge variant={item.status === "found" ? "success" : item.status === "searching" ? "warning" : "secondary"}>
                  {item.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function QuickAction({
  to,
  icon,
  title,
  description,
  badge,
  variant = "default",
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: number;
  variant?: "default" | "primary";
}) {
  return (
    <Link to={to}>
      <Card className={`hover:shadow-md transition-shadow cursor-pointer h-full ${variant === "primary" ? "border-primary/30 bg-primary/5" : ""}`}>
        <CardContent className="pt-6 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className={`p-2 rounded-lg ${variant === "primary" ? "bg-primary/10 text-primary" : "bg-muted"}`}>
              {icon}
            </div>
            {badge !== undefined && badge > 0 && (
              <Badge variant="destructive">{badge}</Badge>
            )}
          </div>
          <p className="font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6 flex items-center gap-4">
        {icon}
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
