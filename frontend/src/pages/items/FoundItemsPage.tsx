import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { itemsApi } from "@/api/items";
import { CATEGORIES } from "@/lib/constants";
import type { FoundItem } from "@/types";

export function FoundItemsPage() {
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  const { data, isLoading } = useQuery({
    queryKey: ["found-items", category, status, page],
    queryFn: () =>
      itemsApi.listFoundItems({
        ...(category && { category }),
        ...(status && { status }),
        limit: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE,
      }),
  });

  const filtered = data?.results.filter((item) =>
    search
      ? item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase())
      : true
  ) ?? [];

  const totalPages = data ? Math.ceil(data.count / PAGE_SIZE) : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Found Items</h1>
          <p className="text-muted-foreground mt-1">
            {data?.count ?? 0} items logged at your venue
          </p>
        </div>
        <Button asChild>
          <Link to="/items/found/new">
            <Plus className="h-4 w-4 mr-2" />
            Log Found Item
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search title or description…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          className="w-40"
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </Select>
        <Select
          className="w-36"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          <option value="">All statuses</option>
          <option value="available">Available</option>
          <option value="claimed">Claimed</option>
          <option value="returned">Returned</option>
        </Select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-64 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((item) => (
            <FoundItemCard key={item._id} item={item} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

function FoundItemCard({ item }: { item: FoundItem }) {
  return (
    <Link to={`/items/found/${item._id}`}>
      <Card className="hover:shadow-md transition-shadow overflow-hidden h-full">
        <div className="aspect-video bg-muted overflow-hidden">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="h-10 w-10 text-muted-foreground/40" />
            </div>
          )}
        </div>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm leading-tight line-clamp-1">{item.title}</h3>
            <Badge
              variant={item.status === "available" ? "success" : item.status === "claimed" ? "warning" : "secondary"}
              className="shrink-0 text-xs"
            >
              {item.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="capitalize">{item.category}</span>
            <span>{new Date(item.found_at).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Package className="h-12 w-12 text-muted-foreground/40 mb-4" />
      <h3 className="font-semibold text-lg mb-1">No items found</h3>
      <p className="text-muted-foreground text-sm mb-4">
        Log a new found item to get started.
      </p>
      <Button asChild>
        <Link to="/items/found/new">
          <Plus className="h-4 w-4 mr-2" />
          Log Found Item
        </Link>
      </Button>
    </div>
  );
}
