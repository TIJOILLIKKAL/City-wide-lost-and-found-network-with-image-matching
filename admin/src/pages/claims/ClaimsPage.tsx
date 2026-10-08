import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { claimsApi } from "@/api/claims";
import type { Claim } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { capitalize, fmtDate } from "@/lib/utils";

const statusBadge: Record<string, "default" | "success" | "warning" | "danger" | "info" | "neutral"> = {
  pending: "warning",
  under_review: "info",
  approved: "info",
  rejected: "danger",
  pickup_scheduled: "default",
  out_for_delivery: "default",
  completed: "success",
  cancelled: "neutral",
};

export function ClaimsPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const params: Record<string, string> = {};
  if (statusFilter) params.status = statusFilter;
  if (page > 1) params.page = String(page);

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ["admin-claims", statusFilter, page],
    queryFn: () => claimsApi.list(params),
    placeholderData: (prev) => prev,
  });

  const PAGE_SIZE = 20;
  const totalPages = data ? Math.ceil(data.count / PAGE_SIZE) : 1;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Claims</h1>
        <p className="text-sm text-gray-500">{data?.count ?? 0} total claims</p>
      </div>

      <div className="flex gap-3">
        <Select
          className="w-48"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="under_review">Under Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="pickup_scheduled">Pickup Scheduled</option>
          <option value="out_for_delivery">Out for Delivery</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">#</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Claimant</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Venue</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Item ID</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Delivery</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Created</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className={isPlaceholderData ? "opacity-60" : ""}>
                {isLoading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i}><td colSpan={8} className="px-4 py-3">
                        <div className="h-5 bg-gray-100 rounded animate-pulse" />
                      </td></tr>
                    ))
                  : data?.results.map((claim: Claim) => (
                      <tr key={claim.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-xs text-gray-500 font-mono">#{claim.id}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{claim.claimant_name}</p>
                          <p className="text-xs text-gray-400">{claim.claimant_email}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{claim.venue_name}</td>
                        <td className="px-4 py-3 text-xs text-gray-400 font-mono truncate max-w-[80px]">
                          {claim.found_item_id}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={statusBadge[claim.status] ?? "neutral"}>
                            {capitalize(claim.status)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 capitalize">
                          {claim.delivery_method ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(claim.created_at)}</td>
                        <td className="px-4 py-3">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/claims/${claim.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
