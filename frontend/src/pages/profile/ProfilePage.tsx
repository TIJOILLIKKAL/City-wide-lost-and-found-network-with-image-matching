import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, User, Building2, Users, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useUser, useIsVenueStaff, useAuthStore } from "@/store/authStore";
import { apiClient } from "@/api/client";

// ─── API helpers ──────────────────────────────────────────────────────────────

const profileApi = {
  getMe: () => apiClient.get("/auth/me/").then((r) => r.data),
  updateMe: (data: { full_name?: string; phone?: string }) =>
    apiClient.patch("/auth/me/", data).then((r) => r.data),
  getMyVenue: () => apiClient.get("/venues/me/").then((r) => r.data),
  updateMyVenue: (data: Record<string, string>) =>
    apiClient.patch("/venues/me/", data).then((r) => r.data),
  listUsers: (params?: Record<string, string>) =>
    apiClient.get("/auth/admin/users/", { params }).then((r) => r.data),
  updateUser: (id: number, data: { role?: string; is_active?: boolean }) =>
    apiClient.patch(`/auth/admin/users/${id}/`, data).then((r) => r.data),
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ProfilePage() {
  const user = useUser();
  const isVenueStaff = useIsVenueStaff();
  const isAdmin = user?.role === "admin";

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your account settings</p>
      </div>

      <PersonalInfoCard />
      {isVenueStaff && <VenueInfoCard />}
      {isAdmin && <AdminUsersCard />}
    </div>
  );
}

// ─── Personal Info ────────────────────────────────────────────────────────────

function PersonalInfoCard() {
  const user = useUser();
  const qc = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: () => profileApi.updateMe({ full_name: fullName, phone }),
    onSuccess: (updated) => {
      setUser(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });

  const roleLabel: Record<string, string> = {
    admin: "Admin",
    venue_staff: "Venue Staff",
    owner: "Regular User",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Personal Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 pb-2">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
            {(user?.full_name?.[0] ?? "?").toUpperCase()}
          </div>
          <div>
            <p className="font-semibold">{user?.full_name}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <Badge variant="secondary" className="mt-1 text-xs">
              {roleLabel[user?.role ?? "owner"] ?? user?.role}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Full Name</Label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <input
            value={user?.email ?? ""}
            disabled
            className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
          />
        </div>

        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="gap-2"
        >
          {mutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <CheckCircle className="h-4 w-4" />
          ) : null}
          {saved ? "Saved!" : "Save Changes"}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Venue Info (venue staff only) ────────────────────────────────────────────

function VenueInfoCard() {
  const { data: venue, isLoading } = useQuery({
    queryKey: ["my-venue"],
    queryFn: profileApi.getMyVenue,
  });

  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [saved, setSaved] = useState(false);
  const [seeded, setSeeded] = useState(false);

  if (venue && !seeded) {
    setName(venue.name ?? "");
    setAddress(venue.address ?? "");
    setContactName(venue.contact_name ?? "");
    setContactEmail(venue.contact_email ?? "");
    setContactPhone(venue.contact_phone ?? "");
    setSeeded(true);
  }

  const mutation = useMutation({
    mutationFn: () => profileApi.updateMyVenue({
      name, address, contact_name: contactName,
      contact_email: contactEmail, contact_phone: contactPhone,
    }),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      qc.invalidateQueries({ queryKey: ["my-venue"] });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Venue Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="h-40 rounded bg-muted animate-pulse" />
        ) : (
          <>
            <div className="flex items-center gap-2 pb-1">
              <Badge variant="outline" className="capitalize">{venue?.venue_type}</Badge>
              <Badge variant={venue?.status === "active" ? "default" : "secondary"}>
                {venue?.status}
              </Badge>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Venue Name" value={name} onChange={setName} />
              <Field label="Contact Name" value={contactName} onChange={setContactName} />
              <Field label="Contact Email" value={contactEmail} onChange={setContactEmail} />
              <Field label="Contact Phone" value={contactPhone} onChange={setContactPhone} />
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="gap-2">
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <CheckCircle className="h-4 w-4" /> : null}
              {saved ? "Saved!" : "Save Venue Details"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Admin User Management ────────────────────────────────────────────────────

function AdminUsersCard() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", search, roleFilter],
    queryFn: () => profileApi.listUsers({
      ...(search && { search }),
      ...(roleFilter && { role: roleFilter }),
    }),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      profileApi.updateUser(id, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) =>
      profileApi.updateUser(id, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const users = data?.results ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          User Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 h-9 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">All roles</option>
            <option value="admin">Admin</option>
            <option value="venue_staff">Venue Staff</option>
            <option value="owner">User</option>
          </select>
        </div>

        {isLoading ? (
          <div className="h-40 rounded bg-muted animate-pulse" />
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No users found.</p>
        ) : (
          <div className="divide-y rounded-lg border overflow-hidden">
            {users.map((u: {
              id: number; email: string; full_name: string;
              role: string; is_active: boolean; venue_name?: string; created_at: string;
            }) => (
              <div key={u.id} className="flex items-center gap-3 p-3 bg-background hover:bg-muted/30">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                  {(u.full_name?.[0] ?? "?").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{u.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  {u.venue_name && (
                    <p className="text-xs text-muted-foreground">{u.venue_name}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={u.role}
                    onChange={(e) => changeRole.mutate({ id: u.id, role: e.target.value })}
                    className="h-7 text-xs rounded border border-input bg-background px-2 focus-visible:outline-none"
                  >
                    <option value="admin">Admin</option>
                    <option value="venue_staff">Staff</option>
                    <option value="owner">User</option>
                  </select>
                  <Button
                    size="sm"
                    variant={u.is_active ? "outline" : "default"}
                    className="h-7 text-xs px-2"
                    onClick={() => toggleActive.mutate({ id: u.id, is_active: !u.is_active })}
                  >
                    {u.is_active ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground text-right">
          {data?.count ?? 0} users total
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  );
}
