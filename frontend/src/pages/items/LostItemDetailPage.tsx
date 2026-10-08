import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Sparkles, Clock, Tag, Palette, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { itemsApi } from "@/api/items";
import { matchingApi } from "@/api/matching";

export function LostItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: item, isLoading } = useQuery({
    queryKey: ["lost-item", id],
    queryFn: () => itemsApi.getLostItem(id!),
    enabled: !!id,
  });

  const { data: matchData, isLoading: matchLoading } = useQuery({
    queryKey: ["matches", "lost", id],
    queryFn: () => matchingApi.getMatches("lost", id!),
    enabled: !!id && item?.embedding_status === "done",
  });

  if (isLoading) return <div className="h-96 rounded-lg bg-muted animate-pulse" />;

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
        <h1 className="text-2xl font-bold">Lost Item</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Image */}
        <div className="rounded-lg overflow-hidden border bg-muted aspect-square">
          {item.image_url ? (
            <img src={item.image_url} alt={item.title} className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <MapPin className="h-16 w-16 text-muted-foreground/30" />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-xl font-bold">{item.title}</h2>
            <Badge variant={item.status === "found" ? "success" : item.status === "searching" ? "warning" : "secondary"}>
              {item.status}
            </Badge>
          </div>

          <p className="text-muted-foreground">{item.description}</p>

          <div className="grid grid-cols-2 gap-3">
            <Detail icon={<Tag className="h-4 w-4" />} label="Category" value={item.category} />
            <Detail icon={<Palette className="h-4 w-4" />} label="Colour" value={item.color || "—"} />
            <Detail icon={<Package className="h-4 w-4" />} label="Brand" value={item.brand || "—"} />
            <Detail icon={<MapPin className="h-4 w-4" />} label="Lost at" value={item.lost_location || "—"} />
            <Detail icon={<Clock className="h-4 w-4" />} label="Date lost" value={new Date(item.lost_at).toLocaleDateString()} />
            <Detail
              icon={<Sparkles className="h-4 w-4" />}
              label="AI Status"
              value={item.embedding_status === "done" ? "Indexed" : item.embedding_status === "pending" ? "Processing…" : item.embedding_status}
            />
          </div>
        </div>
      </div>

      {/* AI Matches — found items that could be this lost item */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Matching Found Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          {item.embedding_status === "skipped" ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No photo provided — add one to enable AI matching, or use{" "}
              <Link to="/search" className="text-primary hover:underline">text search</Link>.
            </p>
          ) : item.embedding_status !== "done" ? (
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
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-3">No matches found yet.</p>
              <Button variant="outline" size="sm" asChild>
                <Link to="/search">Try manual search</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {matchData.results.map((match) => (
                <Link
                  key={match.item_id}
                  to={`/items/found/${match.item_id}`}
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
                    <Badge variant="outline" className="text-xs mt-1">Claim</Badge>
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
