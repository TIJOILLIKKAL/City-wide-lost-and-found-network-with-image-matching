import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Package, Sparkles, Clock, MapPin, Tag, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { itemsApi } from "@/api/items";
import { matchingApi } from "@/api/matching";

export function FoundItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: item, isLoading } = useQuery({
    queryKey: ["found-item", id],
    queryFn: () => itemsApi.getFoundItem(id!),
    enabled: !!id,
  });

  const { data: matchData, isLoading: matchLoading } = useQuery({
    queryKey: ["matches", "found", id],
    queryFn: () => matchingApi.getMatches("found", id!),
    enabled: !!id && item?.embedding_status === "done",
  });

  if (isLoading) {
    return <div className="h-96 rounded-lg bg-muted animate-pulse" />;
  }

  if (!item) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Item not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>Go back</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Found Item</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Image */}
        <div className="rounded-lg overflow-hidden border bg-muted aspect-square">
          {item.image_url ? (
            <img src={item.image_url} alt={item.title} className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="h-16 w-16 text-muted-foreground/30" />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-xl font-bold">{item.title}</h2>
            <Badge variant={item.status === "available" ? "success" : item.status === "claimed" ? "warning" : "secondary"}>
              {item.status}
            </Badge>
          </div>

          <p className="text-muted-foreground">{item.description}</p>

          <div className="grid grid-cols-2 gap-3">
            <Detail icon={<Tag className="h-4 w-4" />} label="Category" value={item.category} />
            <Detail icon={<Palette className="h-4 w-4" />} label="Colour" value={item.color || "—"} />
            <Detail icon={<Package className="h-4 w-4" />} label="Brand" value={item.brand || "—"} />
            <Detail icon={<MapPin className="h-4 w-4" />} label="Location" value={item.found_location || "—"} />
            <Detail icon={<Clock className="h-4 w-4" />} label="Found on" value={new Date(item.found_at).toLocaleDateString()} />
            <Detail
              icon={<Sparkles className="h-4 w-4" />}
              label="AI Status"
              value={item.embedding_status === "done" ? "Indexed" : item.embedding_status === "pending" ? "Processing…" : item.embedding_status}
            />
          </div>

          {item.status === "available" && (
            <Button className="w-full" asChild>
              <Link to={`/claims/new?found_item_id=${item._id}`}>
                Claim This Item
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* AI Matches */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Potential Lost Item Matches
          </CardTitle>
        </CardHeader>
        <CardContent>
          {item.embedding_status !== "done" ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              AI is still processing this item. Matches will appear shortly.
            </p>
          ) : matchLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : !matchData?.results.length ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No matches found yet.</p>
          ) : (
            <div className="space-y-3">
              {matchData.results.map((match) => (
                <Link
                  key={match.item_id}
                  to={`/items/lost/${match.item_id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{match.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{match.description}</p>
                    <p className="text-xs text-muted-foreground capitalize mt-0.5">{match.category}</p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm font-semibold text-primary">{Math.round(match.score * 100)}%</p>
                    <p className="text-xs text-muted-foreground">match</p>
                  </div>
                </Link>
              ))}
              <p className="text-xs text-muted-foreground pt-1">
                Source: {matchData.source === "cache" ? "cached result" : "live search"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-muted-foreground mt-0.5">{icon}</span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium capitalize">{value}</p>
      </div>
    </div>
  );
}
