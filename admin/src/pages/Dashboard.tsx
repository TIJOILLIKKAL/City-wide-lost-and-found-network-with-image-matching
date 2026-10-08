import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Users, Building2, PackageSearch, ClipboardList, PackageOpen } from "lucide-react";
import { statsApi } from "@/api/stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { capitalize } from "@/lib/utils";

const roleBadge: Record<string, "default" | "success" | "warning" | "danger" | "info" | "neutral"> = {
  admin: "danger",
  venue_staff: "info",
  owner: "success",
};
const statusBadge: Record<string, "default" | "success" | "warning" | "danger" | "info" | "neutral"> = {
  active: "success",
  inactive: "neutral",
  suspended: "danger",
};
const claimBadge: Record<string, "default" | "success" | "warning" | "danger" | "info" | "neutral"> = {
  pending: "warning",
  under_review: "info",
  approved: "info",
  completed: "success",
  cancelled: "neutral",
  rejected: "danger",
};

export function Dashboard() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-stats"], queryFn: statsApi.get });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-gray-200" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Platform overview</p>
      </div>

      {/* Big stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatTile icon={<Users className="h-5 w-5" />} label="Users" value={data?.users.total ?? 0} color="indigo" to="/users" />
        <StatTile icon={<Building2 className="h-5 w-5" />} label="Venues" value={data?.venues.total ?? 0} color="violet" to="/venues" />
        <StatTile icon={<PackageSearch className="h-5 w-5" />} label="Found Items" value={data?.items.found ?? 0} color="emerald" to="/found-items" />
        <StatTile icon={<PackageOpen className="h-5 w-5" />} label="Lost Items" value={data?.items.lost ?? 0} color="orange" to="/lost-items" />
        <StatTile icon={<ClipboardList className="h-5 w-5" />} label="Claims" value={data?.claims.total ?? 0} color="amber" to="/claims" />
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BreakdownCard
          title="Users by Role"
          data={data?.users.by_role ?? {}}
          badgeVariants={roleBadge}
        />
        <BreakdownCard
          title="Venues by Status"
          data={data?.venues.by_status ?? {}}
          badgeVariants={statusBadge}
        />
        <BreakdownCard
          title="Claims by Status"
          data={data?.claims.by_status ?? {}}
          badgeVariants={claimBadge}
        />
      </div>
    </div>
  );
}

const tileColors: Record<string, string> = {
  indigo: "bg-indigo-50 text-indigo-600",
  violet: "bg-violet-50 text-violet-600",
  emerald: "bg-emerald-50 text-emerald-600",
  orange: "bg-orange-50 text-orange-600",
  amber: "bg-amber-50 text-amber-600",
};

function StatTile({
  icon, label, value, color, to,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  to: string;
}) {
  return (
    <Link to={to}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-5">
          <div className={`inline-flex p-2.5 rounded-xl mb-3 ${tileColors[color]}`}>{icon}</div>
          <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-0.5">{label}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

function BreakdownCard({
  title,
  data,
  badgeVariants,
}: {
  title: string;
  data: Record<string, number>;
  badgeVariants: Record<string, "default" | "success" | "warning" | "danger" | "info" | "neutral">;
}) {
  const entries = Object.entries(data);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-3 space-y-2">
        {entries.length === 0 ? (
          <p className="text-sm text-gray-400">No data</p>
        ) : (
          entries.map(([key, count]) => (
            <div key={key} className="flex items-center justify-between">
              <Badge variant={badgeVariants[key] ?? "neutral"}>{capitalize(key)}</Badge>
              <span className="text-sm font-semibold text-gray-900">{count}</span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
