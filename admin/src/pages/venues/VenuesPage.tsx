import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Pencil, Trash2, Power, PowerOff } from "lucide-react";
import { venuesApi } from "@/api/venues";
import type { VenueListItem } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { capitalize, fmtDate } from "@/lib/utils";

const statusBadge: Record<string, "default" | "success" | "warning" | "danger" | "info" | "neutral"> = {
  active: "success",
  inactive: "neutral",
  suspended: "danger",
};

export function VenuesPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: typesData } = useQuery({
    queryKey: ["venue-types"],
    queryFn: venuesApi.types,
    staleTime: Infinity,
  });

  const params: Record<string, string | number> = { page };
  if (search) params.search = search;
  if (typeFilter) params.venue_type = typeFilter;
  if (statusFilter) params.status = statusFilter;

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ["admin-venues", search, typeFilter, statusFilter, page],
    queryFn: () => venuesApi.list(params),
    placeholderData: (prev) => prev,
  });

  const deleteMutation = useMutation({
    mutationFn: (slug: string) => venuesApi.remove(slug),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-venues"] }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ slug, activate }: { slug: string; activate: boolean }) =>
      activate ? venuesApi.activate(slug) : venuesApi.deactivate(slug),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-venues"] }),
  });

  const PAGE_SIZE = 20;
  const totalPages = data ? Math.ceil(data.count / PAGE_SIZE) : 1;
  const reset = () => setPage(1);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Venues</h1>
          <p className="text-sm text-gray-500">{data?.count ?? 0} total venues</p>
        </div>
        <Button onClick={() => navigate("/venues/new")}>
          <Plus className="h-4 w-4" />
          New Venue
        </Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <Input
            className="pl-9"
            placeholder="Search by name or city…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); reset(); }}
          />
        </div>
        <Select className="w-44" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); reset(); }}>
          <option value="">All types</option>
          {typesData?.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </Select>
        <Select className="w-36" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); reset(); }}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Venue</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Location</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Staff</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Created</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className={isPlaceholderData ? "opacity-60" : ""}>
                {isLoading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={7} className="px-4 py-3">
                          <div className="h-5 bg-gray-100 rounded animate-pulse" />
                        </td>
                      </tr>
                    ))
                  : data?.results.map((venue) => (
                      <VenueRow
                        key={venue.id}
                        venue={venue}
                        onEdit={() => navigate(`/venues/${venue.slug}/edit`)}
                        onToggle={() =>
                          toggleMutation.mutate({
                            slug: venue.slug,
                            activate: venue.status !== "active",
                          })
                        }
                        onDelete={() => {
                          if (confirm(`Delete "${venue.name}"? This cannot be undone.`)) {
                            deleteMutation.mutate(venue.slug);
                          }
                        }}
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
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

function VenueRow({
  venue,
  onEdit,
  onToggle,
  onDelete,
}: {
  venue: VenueListItem;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const isActive = venue.status === "active";
  return (
    <tr className="border-b last:border-0 hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3">
        <p className="font-medium text-gray-900">{venue.name}</p>
        <p className="text-xs text-gray-400">{venue.slug}</p>
      </td>
      <td className="px-4 py-3 text-xs text-gray-500 capitalize">
        {capitalize(venue.venue_type)}
      </td>
      <td className="px-4 py-3">
        <p className="text-sm text-gray-900">{venue.city}</p>
        <p className="text-xs text-gray-400">{venue.state}</p>
      </td>
      <td className="px-4 py-3">
        <Badge variant={statusBadge[venue.status] ?? "neutral"}>{venue.status}</Badge>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{venue.staff_count}</td>
      <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(venue.created_at)}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 justify-end">
          <Button variant="ghost" size="icon" onClick={onEdit} title="Edit">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={isActive ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50" : "text-green-600 hover:text-green-700 hover:bg-green-50"}
            onClick={onToggle}
            title={isActive ? "Deactivate" : "Activate"}
          >
            {isActive ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={onDelete}
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
