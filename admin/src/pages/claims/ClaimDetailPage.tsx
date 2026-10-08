import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { claimsApi } from "@/api/claims";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { capitalize, fmtDateTime } from "@/lib/utils";

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

export function ClaimDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [rejectionReason, setRejectionReason] = useState("");
  const [trackingId, setTrackingId] = useState("");

  const { data: claim, isLoading } = useQuery({
    queryKey: ["admin-claim", id],
    queryFn: () => claimsApi.get(Number(id)),
    enabled: !!id,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-claim", id] });
    qc.invalidateQueries({ queryKey: ["admin-claims"] });
  };

  const approveMutation = useMutation({
    mutationFn: () => claimsApi.review(Number(id), "approve"),
    onSuccess: invalidate,
  });
  const rejectMutation = useMutation({
    mutationFn: () => claimsApi.review(Number(id), "reject", rejectionReason),
    onSuccess: invalidate,
  });
  const completeMutation = useMutation({
    mutationFn: () => claimsApi.complete(Number(id), trackingId),
    onSuccess: invalidate,
  });
  const cancelMutation = useMutation({
    mutationFn: () => claimsApi.cancel(Number(id)),
    onSuccess: invalidate,
  });

  if (isLoading || !claim) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const canReview = ["pending", "under_review"].includes(claim.status);
  const canComplete = ["approved", "pickup_scheduled", "out_for_delivery"].includes(claim.status);
  const canCancel = !["completed", "cancelled"].includes(claim.status);

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Claim #{claim.id}</h1>
          <Badge variant={statusBadge[claim.status] ?? "neutral"}>{capitalize(claim.status)}</Badge>
        </div>
      </div>

      {/* Details */}
      <Card>
        <CardHeader><CardTitle>Claim Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Info label="Claimant">{claim.claimant_name}<br /><span className="text-gray-400 text-xs">{claim.claimant_email}</span></Info>
          <Info label="Venue">{claim.venue_name}</Info>
          <Info label="Found Item ID"><span className="font-mono text-xs">{claim.found_item_id}</span></Info>
          <Info label="Lost Item ID"><span className="font-mono text-xs">{claim.lost_item_id || "—"}</span></Info>
          <Info label="Delivery Method">{capitalize(claim.delivery_method ?? "not set")}</Info>
          <Info label="Reviewed By">{claim.reviewed_by_name ?? "—"}</Info>
          <Info label="Created">{fmtDateTime(claim.created_at)}</Info>
          <Info label="Reviewed At">{fmtDateTime(claim.reviewed_at)}</Info>
          {claim.rejection_reason && (
            <div className="col-span-2">
              <Info label="Rejection Reason">{claim.rejection_reason}</Info>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Proof */}
      <Card>
        <CardHeader><CardTitle>Proof Description</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{claim.proof_description || "—"}</p>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {/* Approve/Reject */}
          {canReview && (
            <div className="space-y-3 pb-4 border-b">
              <p className="text-sm font-medium text-gray-900">Review Claim</p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending}
              >
                {approveMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Approve
              </Button>
              <div className="space-y-2">
                <Label className="text-xs">Rejection reason (optional)</Label>
                <Textarea
                  className="h-20 text-sm"
                  placeholder="Reason for rejection…"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => rejectMutation.mutate()}
                  disabled={rejectMutation.isPending}
                >
                  {rejectMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Reject
                </Button>
              </div>
            </div>
          )}

          {/* Complete */}
          {canComplete && (
            <div className="space-y-2 pb-4 border-b">
              <p className="text-sm font-medium text-gray-900">Mark as Completed</p>
              <div className="flex gap-2">
                <Input
                  className="h-8 text-sm"
                  placeholder="Tracking ID (optional)"
                  value={trackingId}
                  onChange={(e) => setTrackingId(e.target.value)}
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => completeMutation.mutate()}
                  disabled={completeMutation.isPending}
                >
                  Complete
                </Button>
              </div>
            </div>
          )}

          {/* Cancel */}
          {canCancel && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Cancel Claim</p>
                <p className="text-xs text-gray-400">Reverts the found item to available.</p>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  if (confirm("Cancel this claim?")) cancelMutation.mutate();
                }}
                disabled={cancelMutation.isPending}
              >
                Cancel Claim
              </Button>
            </div>
          )}
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
