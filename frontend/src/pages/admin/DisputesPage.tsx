import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert, CheckCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { claimsApi } from "@/api/claims";
import { CLAIM_STATUS_VARIANT } from "@/lib/constants";
import type { Dispute, Claim } from "@/types";

export function DisputesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["disputes"],
    queryFn: () => claimsApi.listDisputes(),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShieldAlert className="h-6 w-6 text-destructive" />
        <div>
          <h1 className="text-2xl font-bold">Disputed Items</h1>
          <p className="text-muted-foreground text-sm">
            Found items where 2 or more claimants are competing.
          </p>
        </div>
        {data && (
          <Badge variant="destructive" className="ml-auto">
            {data.count} dispute{data.count !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : !data?.results.length ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            No disputed items. All claims are clean.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {data.results.map((dispute) => (
            <DisputeCard key={dispute.found_item_id} dispute={dispute} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Dispute card ─────────────────────────────────────────────────────────────

function DisputeCard({ dispute }: { dispute: Dispute }) {
  const qc = useQueryClient();
  const [winner, setWinner] = useState<number | null>(null);

  const mutation = useMutation({
    mutationFn: () => claimsApi.resolveDispute(dispute.found_item_id, winner!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["disputes"] }),
  });

  return (
    <Card className="border-destructive/30">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {dispute.found_item.image_url && (
            <img
              src={dispute.found_item.image_url}
              alt={dispute.found_item.title}
              className="h-14 w-14 rounded-md object-cover shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base">{dispute.found_item.title}</CardTitle>
            <p className="text-sm text-muted-foreground capitalize mt-0.5">
              {dispute.found_item.category} · ID: <span className="font-mono text-xs">{dispute.found_item_id}</span>
            </p>
          </div>
          <Badge variant="destructive">{dispute.claims.length} claimants</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">Select the rightful owner:</p>

        <div className="grid gap-3 sm:grid-cols-2">
          {dispute.claims.map((claim) => (
            <ClaimCard
              key={claim.id}
              claim={claim}
              selected={winner === claim.id}
              onSelect={() => setWinner(claim.id)}
            />
          ))}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button
            disabled={!winner || mutation.isPending}
            onClick={() => mutation.mutate()}
            className="gap-2"
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            Approve winner & reject others
          </Button>

          {mutation.isSuccess && (
            <p className="text-sm text-green-600">
              Resolved — dispute closed.
            </p>
          )}
          {mutation.isError && (
            <p className="text-sm text-destructive">Error resolving dispute.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Individual claim card inside dispute ─────────────────────────────────────

function ClaimCard({
  claim,
  selected,
  onSelect,
}: {
  claim: Claim;
  selected: boolean;
  onSelect: () => void;
}) {
  const rep = claim.claimant_reputation;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-lg border p-4 transition-all space-y-2 ${
        selected
          ? "border-primary ring-2 ring-primary/30 bg-primary/5"
          : "border-border hover:border-primary/40"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-semibold text-sm">{claim.claimant.full_name}</p>
          <p className="text-xs text-muted-foreground">{claim.claimant.email}</p>
        </div>
        <Badge variant={CLAIM_STATUS_VARIANT[claim.status] ?? "secondary"} className="text-xs shrink-0">
          {claim.status.replace(/_/g, " ")}
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground line-clamp-2">{claim.proof_description}</p>

      {rep && (
        <div className="flex gap-3 text-xs">
          <span className="text-muted-foreground">{rep.total} claims</span>
          <span className="text-green-600">{rep.approved} approved</span>
          {rep.pct != null && (
            <span className="font-medium">{rep.pct}% success</span>
          )}
        </div>
      )}

      {claim.id_verified && (
        <div className="flex items-center gap-1 text-xs text-green-600">
          <CheckCircle className="h-3 w-3" />
          ID verified
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Submitted {new Date(claim.created_at).toLocaleDateString()}
      </p>
    </button>
  );
}
