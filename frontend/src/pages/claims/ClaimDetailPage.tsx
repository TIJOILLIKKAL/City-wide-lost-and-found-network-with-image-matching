import { useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, CheckCircle, XCircle, Truck, Package, MessageSquare, ShieldCheck, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { claimsApi } from "@/api/claims";
import { useUser } from "@/store/authStore";
import { CLAIM_STATUS_LABELS, CLAIM_STATUS_VARIANT } from "@/lib/constants";

export function ClaimDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = useUser();
  const isStaff = user?.role === "venue_staff" || user?.role === "admin";

  const { data: claim, isLoading } = useQuery({
    queryKey: ["claim", id],
    queryFn: () => claimsApi.getClaim(Number(id)),
    enabled: !!id,
  });

  if (isLoading) return <div className="h-96 rounded-lg bg-muted animate-pulse" />;
  if (!claim) return (
    <div className="text-center py-20">
      <p className="text-muted-foreground">Claim not found.</p>
      <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>Go back</Button>
    </div>
  );

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["claim", id] });
    qc.invalidateQueries({ queryKey: ["claims"] });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/claims")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Claim #{claim.id}</h1>
            <Badge variant={CLAIM_STATUS_VARIANT[claim.status] ?? "secondary"}>
              {CLAIM_STATUS_LABELS[claim.status] ?? claim.status}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            Submitted {new Date(claim.created_at).toLocaleDateString()}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate(`/chat/${claim.id}`)} className="gap-2 shrink-0">
          <MessageSquare className="h-4 w-4" />
          Chat
        </Button>
      </div>

      {/* Item + claimant info */}
      <Card>
        <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="Found item" value={
            <Link to={`/items/found/${claim.found_item_id}`} className="text-primary hover:underline font-mono text-xs">
              {claim.found_item_id}
            </Link>
          } />
          {isStaff && <Row label="Claimant" value={`${claim.claimant.full_name} (${claim.claimant.email})`} />}
          <Row label="Venue" value={claim.venue?.name ?? "—"} />
          {claim.delivery_method && (
            <Row label="Delivery" value={<span className="capitalize">{claim.delivery_method}</span>} />
          )}
          {claim.delivery_tracking_id && (
            <Row label="Tracking ID" value={claim.delivery_tracking_id} />
          )}
          {claim.reviewed_by && (
            <Row label="Reviewed by" value={claim.reviewed_by.full_name} />
          )}
          {claim.rejection_reason && (
            <Row
              label="Rejection reason"
              value={<span className="text-destructive">{claim.rejection_reason}</span>}
            />
          )}
        </CardContent>
      </Card>

      {/* Proof */}
      <Card>
        <CardHeader><CardTitle className="text-base">Proof of Ownership</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{claim.proof_description}</p>
        </CardContent>
      </Card>

      {/* Claimant reputation (staff only) */}
      {isStaff && claim.claimant_reputation && (
        <ReputationPanel rep={claim.claimant_reputation} />
      )}

      {/* ID verification */}
      {!isStaff && !claim.id_image_url && (
        <UploadIdPanel claimId={claim.id} onDone={invalidate} />
      )}
      {claim.id_image_url && (
        <IdStatusPanel
          imageUrl={claim.id_image_url}
          verified={claim.id_verified}
          verifiedBy={claim.id_verified_by?.full_name}
          claimId={claim.id}
          isStaff={isStaff}
          onDone={invalidate}
        />
      )}

      {/* Action panels — shown based on role + status */}
      {isStaff && ["pending", "under_review"].includes(claim.status) && (
        <ReviewPanel claimId={claim.id} onDone={invalidate} />
      )}

      {!isStaff && claim.status === "approved" && (
        <DeliveryPanel claimId={claim.id} venueId={claim.venue?.id} onDone={invalidate} />
      )}

      {isStaff && ["pickup_scheduled", "out_for_delivery"].includes(claim.status) && (
        <CompletePanel claimId={claim.id} onDone={invalidate} />
      )}

      {!["completed", "cancelled"].includes(claim.status) && !isStaff && (
        <CancelPanel claimId={claim.id} onDone={() => { invalidate(); navigate("/claims"); }} />
      )}
    </div>
  );
}

// ─── Reputation panel ─────────────────────────────────────────────────────────

function ReputationPanel({ rep }: { rep: { total: number; approved: number; rejected: number; pct: number | null } }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Claimant Reputation</CardTitle></CardHeader>
      <CardContent>
        <div className="flex gap-6 text-sm">
          <div className="text-center">
            <p className="text-2xl font-bold">{rep.total}</p>
            <p className="text-muted-foreground text-xs">Total claims</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{rep.approved}</p>
            <p className="text-muted-foreground text-xs">Approved</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-destructive">{rep.rejected}</p>
            <p className="text-muted-foreground text-xs">Rejected</p>
          </div>
          {rep.pct != null && (
            <div className="text-center">
              <p className="text-2xl font-bold">{rep.pct}%</p>
              <p className="text-muted-foreground text-xs">Success rate</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Owner: upload ID ─────────────────────────────────────────────────────────

function UploadIdPanel({ claimId, onDone }: { claimId: number; onDone: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const mutation = useMutation({
    mutationFn: (file: File) => claimsApi.uploadId(claimId, file),
    onSuccess: onDone,
  });

  return (
    <Card className="border-yellow-500/30">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-yellow-500" />
          ID Verification <span className="text-muted-foreground font-normal text-sm">(optional but speeds up approval)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Upload a photo of a government-issued ID to help verify your identity. This is required for high-value items.
        </p>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => inputRef.current?.click()}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Upload ID Photo
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) mutation.mutate(f);
          }}
        />
        {mutation.isError && (
          <p className="text-xs text-destructive">Upload failed. Please try again.</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── ID status panel ──────────────────────────────────────────────────────────

function IdStatusPanel({
  imageUrl,
  verified,
  verifiedBy,
  claimId,
  isStaff,
  onDone,
}: {
  imageUrl: string;
  verified: boolean;
  verifiedBy?: string;
  claimId: number;
  isStaff: boolean;
  onDone: () => void;
}) {
  const mutation = useMutation({
    mutationFn: () => claimsApi.verifyId(claimId),
    onSuccess: onDone,
  });

  return (
    <Card className={verified ? "border-green-500/30" : "border-yellow-500/30"}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className={`h-4 w-4 ${verified ? "text-green-500" : "text-yellow-500"}`} />
          ID Document
          {verified ? (
            <Badge variant="success" className="ml-1">Verified</Badge>
          ) : (
            <Badge variant="warning" className="ml-1">Pending verification</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <a href={imageUrl} target="_blank" rel="noreferrer">
          <img src={imageUrl} alt="ID document" className="max-h-40 rounded border object-contain" />
        </a>
        {verified && verifiedBy && (
          <p className="text-xs text-muted-foreground">Verified by {verifiedBy}</p>
        )}
        {isStaff && !verified && (
          <Button
            size="sm"
            className="gap-2"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
            <CheckCircle className="h-3 w-3" />
            Mark as Verified
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Staff review ─────────────────────────────────────────────────────────────

function ReviewPanel({ claimId, onDone }: { claimId: number; onDone: () => void }) {
  const [action, setAction] = useState<"approve" | "reject">("approve");
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      claimsApi.reviewClaim(claimId, action, action === "reject" ? reason : undefined),
    onSuccess: onDone,
  });

  const handleConfirm = () => {
    if (action === "reject" && reason.trim().length < 5) {
      setReasonError("Please provide a reason (at least 5 characters).");
      return;
    }
    setReasonError("");
    mutation.mutate();
  };

  return (
    <Card className="border-primary/30">
      <CardHeader><CardTitle className="text-base">Review Claim</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <Button
            type="button"
            variant={action === "approve" ? "default" : "outline"}
            onClick={() => setAction("approve")}
            className="flex-1"
          >
            <CheckCircle className="h-4 w-4 mr-2" /> Approve
          </Button>
          <Button
            type="button"
            variant={action === "reject" ? "destructive" : "outline"}
            onClick={() => setAction("reject")}
            className="flex-1"
          >
            <XCircle className="h-4 w-4 mr-2" /> Reject
          </Button>
        </div>

        {action === "reject" && (
          <div className="space-y-1.5">
            <Label>Reason for rejection *</Label>
            <Textarea
              rows={3}
              placeholder="Explain why the claim is being rejected…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            {reasonError && <p className="text-xs text-destructive">{reasonError}</p>}
          </div>
        )}

        <Button
          onClick={handleConfirm}
          disabled={mutation.isPending}
          variant={action === "reject" ? "destructive" : "default"}
        >
          {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Confirm {action === "approve" ? "Approval" : "Rejection"}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Owner delivery selection ─────────────────────────────────────────────────

function DeliveryPanel({ claimId, venueId, onDone }: { claimId: number; venueId?: number; onDone: () => void }) {
  const [method, setMethod] = useState<"pickup" | "courier">("pickup");
  const [address, setAddress] = useState("");

  const { data: slots } = useQuery({
    queryKey: ["pickup-slots", venueId],
    queryFn: () => claimsApi.listPickupSlots(venueId!),
    enabled: !!venueId && method === "pickup",
  });

  const [slotId, setSlotId] = useState<number | "">("");

  const mutation = useMutation({
    mutationFn: () =>
      claimsApi.setDelivery(claimId, {
        delivery_method: method,
        pickup_slot_id: method === "pickup" && slotId ? Number(slotId) : undefined,
        delivery_address: method === "courier" ? address : undefined,
      }),
    onSuccess: onDone,
  });

  return (
    <Card className="border-primary/30">
      <CardHeader><CardTitle className="text-base">Choose Delivery Method</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <Button
            type="button"
            variant={method === "pickup" ? "default" : "outline"}
            onClick={() => setMethod("pickup")}
            className="flex-1"
          >
            <Package className="h-4 w-4 mr-2" /> Pickup at Venue
          </Button>
          <Button
            type="button"
            variant={method === "courier" ? "default" : "outline"}
            onClick={() => setMethod("courier")}
            className="flex-1"
          >
            <Truck className="h-4 w-4 mr-2" /> Courier Delivery
          </Button>
        </div>

        {method === "pickup" && (
          <div className="space-y-1.5">
            <Label>Select a pickup slot</Label>
            <Select value={String(slotId)} onChange={(e) => setSlotId(Number(e.target.value) || "")}>
              <option value="">Choose slot…</option>
              {slots?.results.filter((s) => s.is_available).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.date} · {s.start_time}–{s.end_time} ({s.slots_remaining} left)
                </option>
              ))}
            </Select>
          </div>
        )}

        {method === "courier" && (
          <div className="space-y-1.5">
            <Label>Delivery address</Label>
            <Textarea
              rows={2}
              placeholder="Full delivery address…"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
        )}

        <Button
          onClick={() => mutation.mutate()}
          disabled={
            mutation.isPending ||
            (method === "pickup" && !slotId) ||
            (method === "courier" && !address.trim())
          }
        >
          {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Confirm Delivery
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Staff complete ────────────────────────────────────────────────────────────

function CompletePanel({ claimId, onDone }: { claimId: number; onDone: () => void }) {
  const [trackingId, setTrackingId] = useState("");
  const mutation = useMutation({
    mutationFn: () => claimsApi.completeClaim(claimId, trackingId || undefined),
    onSuccess: onDone,
  });

  return (
    <Card className="border-green-500/30">
      <CardHeader><CardTitle className="text-base">Mark as Completed</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Tracking ID <span className="text-muted-foreground">(optional — for courier)</span></Label>
          <input
            type="text"
            value={trackingId}
            onChange={(e) => setTrackingId(e.target.value)}
            placeholder="e.g. DTDC123456789"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="bg-green-600 hover:bg-green-700"
        >
          {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Mark Completed
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Owner cancel ─────────────────────────────────────────────────────────────

function CancelPanel({ claimId, onDone }: { claimId: number; onDone: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const mutation = useMutation({
    mutationFn: () => claimsApi.cancelClaim(claimId),
    onSuccess: onDone,
  });

  if (!confirming) {
    return (
      <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setConfirming(true)}>
        Cancel Claim
      </Button>
    );
  }

  return (
    <Card className="border-destructive/30">
      <CardContent className="p-4 flex items-center justify-between gap-4">
        <p className="text-sm">Are you sure you want to cancel this claim?</p>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>No</Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
            Yes, Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
