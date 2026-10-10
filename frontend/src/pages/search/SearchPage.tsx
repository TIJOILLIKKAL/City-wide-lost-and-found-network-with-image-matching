import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Search, Image, Type, Loader2, Package, ExternalLink } from "lucide-react";
import { MatchScoreBadge } from "@/components/items/MatchScoreBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageDropzone } from "@/components/items/ImageDropzone";
import { matchingApi } from "@/api/matching";
import { CATEGORIES } from "@/lib/constants";
import type { MatchResult } from "@/types";

type Tab = "image" | "text";

export function SearchPage() {
  const [tab, setTab] = useState<Tab>("image");
  const [results, setResults] = useState<MatchResult[] | null>(null);
  const [searchedType, setSearchedType] = useState<"found" | "lost">("found");

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Search</h1>
        <p className="text-muted-foreground mt-1">
          Find matching items using a photo or text description.
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
        <TabBtn active={tab === "image"} onClick={() => setTab("image")} icon={<Image className="h-4 w-4" />} label="Image Search" />
        <TabBtn active={tab === "text"} onClick={() => setTab("text")} icon={<Type className="h-4 w-4" />} label="Text Search" />
      </div>

      {tab === "image" ? (
        <ImageSearchForm onResults={(r, t) => { setResults(r); setSearchedType(t); }} />
      ) : (
        <TextSearchForm onResults={(r, t) => { setResults(r); setSearchedType(t); }} />
      )}

      {results !== null && (
        <SearchResults results={results} itemType={searchedType} />
      )}
    </div>
  );
}

// ─── Image search ─────────────────────────────────────────────────────────────

function ImageSearchForm({ onResults }: { onResults: (r: MatchResult[], t: "found" | "lost") => void }) {
  const [image, setImage] = useState<File | null>(null);
  const [itemType, setItemType] = useState<"found" | "lost">("found");
  const [imageError, setImageError] = useState("");

  const mutation = useMutation({
    mutationFn: (fd: globalThis.FormData) => matchingApi.searchByImage(fd as unknown as FormData),
    onSuccess: (data) => onResults(data.results, itemType),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!image) { setImageError("Upload a photo to search."); return; }
    setImageError("");
    const fd = new globalThis.FormData();
    fd.append("image", image);
    fd.append("item_type", itemType);
    fd.append("top_k", "10");
    mutation.mutate(fd);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Image className="h-4 w-4" /> Search by Photo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Upload a photo</Label>
            <ImageDropzone value={image} onChange={setImage} />
            {imageError && <p className="text-xs text-destructive">{imageError}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Search in</Label>
            <Select className="w-48" value={itemType} onChange={(e) => setItemType(e.target.value as "found" | "lost")}>
              <option value="found">Found items (what venues have)</option>
              <option value="lost">Lost reports (what owners reported)</option>
            </Select>
          </div>

          {mutation.error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded px-3 py-2">
              Search unavailable — AI packages may not be installed on the server.
            </p>
          )}

          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Search
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Text search ──────────────────────────────────────────────────────────────

interface TextForm { query: string; category: string; }

function TextSearchForm({ onResults }: { onResults: (r: MatchResult[], t: "found" | "lost") => void }) {
  const [itemType, setItemType] = useState<"found" | "lost">("found");
  const { register, handleSubmit, formState: { errors } } = useForm<TextForm>();

  const mutation = useMutation({
    mutationFn: ({ query, category }: TextForm) =>
      matchingApi.searchByText(query, itemType, category || undefined),
    onSuccess: (data) => onResults(data.results, itemType),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Type className="h-4 w-4" /> Search by Description
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input
              placeholder="e.g. black leather wallet with blue stitching"
              {...register("query", { required: "Enter a search description" })}
            />
            {errors.query && <p className="text-xs text-destructive">{errors.query.message}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Search in</Label>
              <Select value={itemType} onChange={(e) => setItemType(e.target.value as "found" | "lost")}>
                <option value="found">Found items</option>
                <option value="lost">Lost reports</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Category <span className="text-muted-foreground">(optional)</span></Label>
              <Select {...register("category")}>
                <option value="">All categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </Select>
            </div>
          </div>

          {mutation.error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded px-3 py-2">
              Search failed. Please try again.
            </p>
          )}

          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Search
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Results ──────────────────────────────────────────────────────────────────

function SearchResults({ results, itemType }: { results: MatchResult[]; itemType: "found" | "lost" }) {
  if (results.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Package className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-medium">No matches found</p>
          <p className="text-sm text-muted-foreground mt-1">Try a different photo or description.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-muted-foreground">
        {results.length} result{results.length !== 1 ? "s" : ""} in {itemType === "found" ? "found items" : "lost reports"}
      </p>
      {results.map((r) => (
        <Link
          key={r.item_id}
          to={`/items/${itemType}/${r.item_id}`}
          className="block"
        >
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-sm truncate">{r.title}</p>
                  <Badge variant="outline" className="capitalize shrink-0 text-xs">{r.category}</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{r.description}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {r.reported_at ? new Date(r.reported_at).toLocaleDateString() : ""}
                </p>
              </div>
              <div className="flex flex-col items-center gap-2 shrink-0">
                <MatchScoreBadge score={r.score} size="sm" />
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function TabBtn({ active, onClick, icon, label }: {
  active: boolean; onClick: () => void;
  icon: React.ReactNode; label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
        active ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}{label}
    </button>
  );
}
