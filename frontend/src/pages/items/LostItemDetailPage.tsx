import { useRef, useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, MapPin, Sparkles, Clock, Tag, Palette, Package,
  Pencil, Trash2, CheckCircle, X, Upload, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { itemsApi } from "@/api/items";
import { matchingApi } from "@/api/matching";
import { CATEGORIES } from "@/lib/constants";

const STATUS_BADGE: Record<string, "success" | "warning" | "secondary"> = {
  searching: "warning",
  found: "success",
  closed: "secondary",
};

export function LostItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    title: "", description: "", category: "", color: "", brand: "",
    lost_at: "", lost_location: "",
  });

  const { data: item, isLoading } = useQuery({
    queryKey: ["lost-item", id],
    queryFn: () => itemsApi.getLostItem(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (item) {
      setForm({
        title: item.title,
        description: item.description,
        category: item.category,
        color: item.color ?? "",
        brand: item.brand ?? "",
        lost_at: item.lost_at?.slice(0, 16) ?? "",
        lost_location: item.lost_location ?? "",
      });
    }
  }, [item]);

  const { data: matchData, isLoading: matchLoading } = useQuery({
    queryKey: ["matches", "lost", id],
    queryFn: () => matchingApi.getMatches("lost", id!),
    enabled: !!id && item?.embedding_status === "done",
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["lost-item", id] });
    qc.invalidateQueries({ queryKey: ["lost-items"] });
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
      if (imageFile) fd.append("image", imageFile);
      return itemsApi.updateLostItem(id!, fd);
    },
    onSuccess: () => { invalidate(); setEditing(false); setImageFile(null); setPreviewUrl(null); },
  });

  const markFoundMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append("status", "found");
      return itemsApi.updateLostItem(id!, fd);
    },
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: () => itemsApi.deleteLostItem(id!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["lost-items"] }); navigate("/items/lost"); },
  });

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  if (isLoading) return <div className="h-96 rounded-lg bg-muted animate-pulse" />;
  if (!item) return (
    <div className="text-center py-20">
      <p className="text-muted-foreground">Item not found.</p>
      <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>Go back</Button>
    </div>
  );

  const isActive = item.status !== "closed";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Lost Item</h1>
          <Badge variant={STATUS_BADGE[item.status] ?? "secondary" as const}>
            {item.status}
          </Badge>
        </div>

        {isActive && !editing && (
          <div className="flex items-center gap-2">
            {item.status === "searching" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markFoundMutation.mutate()}
                disabled={markFoundMutation.isPending}
              >
                {markFoundMutation.isPending
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <CheckCircle className="h-4 w-4 mr-1.5 text-green-600" />}
                Mark as Found
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4 mr-1.5" /> Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive/10"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-4 w-4 mr-1.5" /> Delete
            </Button>
          </div>
        )}

        {editing && (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Save
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setImageFile(null); setPreviewUrl(null); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 flex items-center justify-between gap-4">
          <p className="text-sm font-medium">Delete this item? It will be moved to the Closed tab.</p>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Delete"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Image */}
        <div className="space-y-2">
          <div className="rounded-lg overflow-hidden border bg-muted aspect-square relative">
            {(previewUrl ?? item.image_url) ? (
              <img
                src={previewUrl ?? item.image_url}
                alt={item.title}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <MapPin className="h-16 w-16 text-muted-foreground/30" />
              </div>
            )}
          </div>
          {editing && (
            <>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
              <Button variant="outline" size="sm" className="w-full" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                {imageFile ? imageFile.name : "Replace image"}
              </Button>
            </>
          )}
        </div>

        {/* Details / Edit form */}
        <div className="space-y-4">
          {editing ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Textarea
                  className="h-24 resize-none"
                  value={form.description}
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Category</Label>
                  <Select value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}>
                    <option value="">Select…</option>
                    {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Colour</Label>
                  <Input value={form.color} onChange={(e) => setForm(f => ({ ...f, color: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Brand</Label>
                  <Input value={form.brand} onChange={(e) => setForm(f => ({ ...f, brand: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Lost location</Label>
                  <Input value={form.lost_location} onChange={(e) => setForm(f => ({ ...f, lost_location: e.target.value }))} />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label>Date/time lost</Label>
                  <Input
                    type="datetime-local"
                    value={form.lost_at}
                    onChange={(e) => setForm(f => ({ ...f, lost_at: e.target.value }))}
                  />
                </div>
              </div>
              {saveMutation.isError && (
                <p className="text-sm text-destructive">Failed to save. Please try again.</p>
              )}
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold">{item.title}</h2>
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
            </>
          )}
        </div>
      </div>

      {/* AI Matches */}
      {item.status !== "closed" && (
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
      )}
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
