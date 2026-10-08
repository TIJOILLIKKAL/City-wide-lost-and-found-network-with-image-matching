import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { usersApi } from "@/api/users";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { fmtDate, capitalize } from "@/lib/utils";
import type { AdminUser } from "@/types";

const roleBadge: Record<string, "default" | "success" | "warning" | "danger" | "info" | "neutral"> = {
  admin: "danger",
  venue_staff: "info",
  owner: "success",
};

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [role, setRole] = useState<AdminUser["role"] | "">("");

  const { data: user, isLoading } = useQuery({
    queryKey: ["admin-user", id],
    queryFn: () => usersApi.get(Number(id)),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (patch: Parameters<typeof usersApi.update>[1]) =>
      usersApi.update(Number(id), patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-user", id] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => usersApi.remove(Number(id)),
    onSuccess: () => navigate("/users"),
  });

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Detail</h1>
          <p className="text-sm text-gray-500"># {user.id}</p>
        </div>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xl font-bold">
              {user.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">{user.full_name}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
              {user.phone && <p className="text-sm text-gray-500">{user.phone}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2 border-t">
            <Info label="Role"><Badge variant={roleBadge[user.role] ?? "neutral"}>{capitalize(user.role)}</Badge></Info>
            <Info label="Venue">{user.venue_name ?? "—"}</Info>
            <Info label="Joined">{fmtDate(user.created_at)}</Info>
            <Info label="Verified">{user.is_verified ? "✓ Yes" : "✗ No"}</Info>
          </div>
        </CardContent>
      </Card>

      {/* Actions Card */}
      <Card>
        <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {/* Role */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Change Role</p>
              <p className="text-xs text-gray-500">Current: {capitalize(user.role)}</p>
            </div>
            <div className="flex gap-2">
              <Select
                className="w-36 h-8 text-xs"
                value={role || user.role}
                onChange={(e) => setRole(e.target.value as AdminUser["role"])}
              >
                <option value="admin">Admin</option>
                <option value="venue_staff">Venue Staff</option>
                <option value="owner">Owner</option>
              </Select>
              <Button
                size="sm"
                onClick={() => updateMutation.mutate({ role: (role || user.role) as AdminUser["role"] })}
                disabled={updateMutation.isPending}
              >
                Save
              </Button>
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between border-t pt-4">
            <div>
              <p className="text-sm font-medium text-gray-900">Account Status</p>
              <p className="text-xs text-gray-500">{user.is_active ? "Currently active" : "Currently inactive"}</p>
            </div>
            <Button
              variant={user.is_active ? "danger" : "primary"}
              size="sm"
              onClick={() => updateMutation.mutate({ is_active: !user.is_active })}
              disabled={updateMutation.isPending}
            >
              {user.is_active ? "Deactivate" : "Activate"}
            </Button>
          </div>

          {/* Verify toggle */}
          <div className="flex items-center justify-between border-t pt-4">
            <div>
              <p className="text-sm font-medium text-gray-900">Verification</p>
              <p className="text-xs text-gray-500">{user.is_verified ? "Verified user" : "Not yet verified"}</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => updateMutation.mutate({ is_verified: !user.is_verified })}
              disabled={updateMutation.isPending}
            >
              {user.is_verified ? "Unverify" : "Verify"}
            </Button>
          </div>

          {/* Delete */}
          <div className="flex items-center justify-between border-t pt-4">
            <div>
              <p className="text-sm font-medium text-gray-900">Delete User</p>
              <p className="text-xs text-red-500">This action is permanent.</p>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (confirm(`Delete ${user.full_name}? This cannot be undone.`)) {
                  deleteMutation.mutate();
                }
              }}
              disabled={deleteMutation.isPending}
            >
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <div className="text-sm text-gray-900">{children}</div>
    </div>
  );
}
