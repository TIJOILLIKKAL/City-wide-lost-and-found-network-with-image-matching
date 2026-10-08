import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, CheckCircle, XCircle, Eye } from "lucide-react";
import { usersApi } from "@/api/users";
import type { AdminUser } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fmtDate } from "@/lib/utils";

export function UsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const params: Record<string, string> = {};
  if (search) params.search = search;
  if (roleFilter) params.role = roleFilter;
  if (activeFilter) params.is_active = activeFilter;
  if (page > 1) params.page = String(page);

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ["admin-users", search, roleFilter, activeFilter, page],
    queryFn: () => usersApi.list(params),
    placeholderData: (prev) => prev,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Parameters<typeof usersApi.update>[1] }) =>
      usersApi.update(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const PAGE_SIZE = 20;
  const totalPages = data ? Math.ceil(data.count / PAGE_SIZE) : 1;

  const reset = () => setPage(1);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="text-sm text-gray-500">{data?.count ?? 0} total users</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <Input
            className="pl-9"
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); reset(); }}
          />
        </div>
        <Select className="w-40" value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); reset(); }}>
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="venue_staff">Venue Staff</option>
          <option value="owner">Owner</option>
        </Select>
        <Select className="w-36" value={activeFilter} onChange={(e) => { setActiveFilter(e.target.value); reset(); }}>
          <option value="">All status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">User</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Venue</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Verified</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Joined</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className={isPlaceholderData ? "opacity-60" : ""}>
                {isLoading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={7} className="px-4 py-3">
                          <div className="h-5 bg-gray-100 rounded animate-pulse" />
                        </td>
                      </tr>
                    ))
                  : data?.results.map((user) => (
                      <UserRow
                        key={user.id}
                        user={user}
                        onRoleChange={(role) =>
                          updateMutation.mutate({ id: user.id, patch: { role } })
                        }
                        onToggleActive={() =>
                          updateMutation.mutate({ id: user.id, patch: { is_active: !user.is_active } })
                        }
                        onToggleVerify={() =>
                          updateMutation.mutate({ id: user.id, patch: { is_verified: !user.is_verified } })
                        }
                        onView={() => navigate(`/users/${user.id}`)}
                      />
                    ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

function UserRow({
  user,
  onRoleChange,
  onToggleActive,
  onToggleVerify,
  onView,
}: {
  user: AdminUser;
  onRoleChange: (role: AdminUser["role"]) => void;
  onToggleActive: () => void;
  onToggleVerify: () => void;
  onView: () => void;
}) {
  const initials = (user.full_name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <tr className="border-b last:border-0 hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
            {initials}
          </div>
          <div>
            <p className="font-medium text-gray-900 leading-none">{user.full_name}</p>
            <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <Select
          className="h-7 text-xs w-32 py-0"
          value={user.role}
          onChange={(e) => onRoleChange(e.target.value as AdminUser["role"])}
        >
          <option value="admin">Admin</option>
          <option value="venue_staff">Venue Staff</option>
          <option value="owner">Owner</option>
        </Select>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-gray-500">{user.venue_name ?? "—"}</span>
      </td>
      <td className="px-4 py-3">
        <button onClick={onToggleVerify} className="flex items-center gap-1.5 text-xs hover:opacity-80">
          {user.is_verified ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <XCircle className="h-4 w-4 text-gray-400" />
          )}
          {user.is_verified ? "Yes" : "No"}
        </button>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-gray-500">{fmtDate(user.created_at)}</span>
      </td>
      <td className="px-4 py-3">
        <button onClick={onToggleActive} className="hover:opacity-80">
          <Badge variant={user.is_active ? "success" : "neutral"}>
            {user.is_active ? "Active" : "Inactive"}
          </Badge>
        </button>
      </td>
      <td className="px-4 py-3">
        <Button variant="ghost" size="icon" onClick={onView} title="View detail">
          <Eye className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  );
}
