import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { claimsApi } from "@/api/claims";
import { itemsApi } from "@/api/items";

const schema = z.object({
  proof_description: z.string().min(20, "Please provide at least 20 characters describing proof of ownership."),
  lost_item_id: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function SubmitClaimPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const queryClient = useQueryClient();
  const foundItemId = params.get("found_item_id") ?? "";

  const { data: foundItem, isLoading: itemLoading } = useQuery({
    queryKey: ["found-item", foundItemId],
    queryFn: () => itemsApi.getFoundItem(foundItemId),
    enabled: !!foundItemId,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      claimsApi.submitClaim({
        found_item_id: foundItemId,
        lost_item_id: data.lost_item_id || undefined,
        proof_description: data.proof_description,
      }),
    onSuccess: (claim) => {
      queryClient.invalidateQueries({ queryKey: ["claims"] });
      navigate(`/claims/${claim.id}`);
    },
  });

  if (!foundItemId) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">No item specified. Browse found items to claim one.</p>
        <Button className="mt-4" onClick={() => navigate("/items/found")}>Browse Found Items</Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Submit a Claim</h1>
          <p className="text-muted-foreground text-sm">Provide proof of ownership to claim this item.</p>
        </div>
      </div>

      {/* Item preview */}
      {itemLoading ? (
        <div className="h-24 rounded-lg bg-muted animate-pulse" />
      ) : foundItem ? (
        <Card>
          <CardContent className="p-4 flex gap-4 items-center">
            {foundItem.image_url && (
              <img src={foundItem.image_url} alt={foundItem.title} className="h-16 w-16 rounded object-cover shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{foundItem.title}</p>
              <p className="text-sm text-muted-foreground line-clamp-1">{foundItem.description}</p>
              <div className="flex gap-2 mt-1">
                <Badge variant="outline" className="text-xs capitalize">{foundItem.category}</Badge>
                <Badge variant={foundItem.status === "available" ? "success" : "warning"} className="text-xs">
                  {foundItem.status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Proof of Ownership</CardTitle>
          <CardDescription>
            Describe how you can prove this item is yours — unique features, what's inside, purchase details, etc.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Textarea
                rows={5}
                placeholder="e.g. My wallet has a photo of my dog inside and a scratch on the bottom-right corner. I bought it in Delhi in 2023…"
                {...register("proof_description")}
              />
              {errors.proof_description && (
                <p className="text-xs text-destructive">{errors.proof_description.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>
                Link to your lost item report{" "}
                <span className="text-muted-foreground">(optional — helps matching)</span>
              </Label>
              <Input
                placeholder="Lost item ID from My Lost Items"
                {...register("lost_item_id")}
              />
            </div>

            {mutation.error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded px-3 py-2">
                {String((mutation.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Failed to submit. Please try again.")}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={mutation.isPending || foundItem?.status !== "available"}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Claim
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
            </div>

            {foundItem?.status !== "available" && (
              <p className="text-xs text-muted-foreground">
                This item is no longer available for claiming.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
