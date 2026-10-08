import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { claimsApi } from "@/api/claims";
import { useUser } from "@/store/authStore";
import { CLAIM_STATUS_LABELS, CLAIM_STATUS_VARIANT } from "@/lib/constants";
import type { Claim } from "@/types";

export function ClaimsListPage() {
  const user = useUser();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const { data, isLoading } = useQuery({
    queryKey: ["claims", status, page],
    queryFn: () =>
      claimsApi.listClaims({
        ...(status && { status }),
        limit: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE,
      }),
  });

  const totalPages = data ? Math.ceil(data.count / PAGE_SIZE) : 1;
  const isStaff = user?.role === "venue_staff" || user?.role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Claims</h1>
          <p className="text-muted-foreground mt-1">
            {isStaff ? "Review and manage item claims." : "Track your item claims."}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-3">
        <Select className="w-48" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {Object.entries(CLAIM_STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : !data?.results.length ? (
        <EmptyState isStaff={isStaff} />
      ) : (
        <div className="space-y-3">
          {data.results.map((claim) => (
            <ClaimRow key={claim.id} claim={claim} isStaff={isStaff} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}

function ClaimRow({ claim, isStaff }: { claim: Claim; isStaff: boolean }) {
  const needsAction =
    (isStaff && ["pending", "under_review"].includes(claim.status)) ||
    (!isStaff && claim.status === "approved");

  return (
    <Link to={`/claims/${claim.id}`}>
      <Card className={`hover:shadow-md transition-shadow ${needsAction ? "border-primary/40 bg-primary/5" : ""}`}>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold">Claim #{claim.id}</p>
              <Badge variant={CLAIM_STATUS_VARIANT[claim.status] ?? "secondary"} className="text-xs">
                {CLAIM_STATUS_LABELS[claim.status] ?? claim.status}
              </Badge>
              {needsAction && (
                <Badge variant="destructive" className="text-xs">Action needed</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              Item: {claim.found_item_id}
            </p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {isStaff && <span>By: {claim.claimant.full_name}</span>}
              <span>{claim.delivery_method ? `Delivery: ${claim.delivery_method}` : "No delivery set"}</span>
              <span>{new Date(claim.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </CardContent>
      </Card>
    </Link>
  );
}

function EmptyState({ isStaff }: { isStaff: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <ClipboardList className="h-12 w-12 text-muted-foreground/40 mb-4" />
      <h3 className="font-semibold text-lg mb-1">No claims yet</h3>
      <p className="text-sm text-muted-foreground">
        {isStaff
          ? "Claims submitted by owners will appear here."
          : "Browse found items and submit a claim when you find a match."}
      </p>
      {!isStaff && (
        <Button className="mt-4" asChild>
          <Link to="/items/found">Browse Found Items</Link>
        </Button>
      )}
    </div>
  );
}
