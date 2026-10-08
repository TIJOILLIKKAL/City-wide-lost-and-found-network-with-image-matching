import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { itemsApi } from "@/api/items";
import { CATEGORIES } from "@/lib/constants";
import type { LostItem } from "@/types";

type Tab = "searching" | "found" | "closed";

const TABS: { value: Tab; label: string }[] = [
  { value: "searching", label: "Searching" },
  { value: "found",     label: "Found" },
  { value: "closed",    label: "Closed" },
];

export function LostItemsPage() {
  const [tab, setTab] = useState<Tab>("searching");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  const { data, isLoading } = useQuery({
    queryKey: ["lost-items", tab, category, page],
    queryFn: () =>
      itemsApi.listLostItems({
        status: tab,
        ...(category && { category }),
        limit: PAGE_SIZE,
        page,
      }),
  });

  const filtered = (data?.results ?? []).filter((item) =>
    search
      ? item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase())
      : true
  );

  const totalPages = data ? Math.ceil((data.count ?? filtered.length) / PAGE_SIZE) : 1;

  const handleTabChange = (t: Tab) => {
    setTab(t);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Lost Items</h1>
          <p className="text-muted-foreground mt-1">{data?.count ?? filtered.length} items</p>
        </div>
        <Button asChild>
          <Link to="/items/lost/new">
            <Plus className="h-4 w-4 mr-2" />
            Report Lost Item
          </Link>
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => handleTabChange(t.value)}
            className={[
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              tab === t.value
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
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
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-56 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState tab={tab} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((item) => (
            <LostItemCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

function LostItemCard({ item }: { item: LostItem }) {
  return (
    <Link to={`/items/lost/${item.id}`}>
      <Card className="hover:shadow-md transition-shadow overflow-hidden h-full">
        <div className="aspect-video bg-muted overflow-hidden">
          {item.image_url ? (
            <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <MapPin className="h-10 w-10 text-muted-foreground/40" />
            </div>
          )}
        </div>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm leading-tight line-clamp-1">{item.title}</h3>
            <Badge
              variant={item.status === "found" ? "success" : item.status === "searching" ? "warning" : "secondary"}
              className="shrink-0 text-xs"
            >
              {item.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="capitalize">{item.category}</span>
            <span>Lost {new Date(item.lost_at).toLocaleDateString()}</span>
          </div>
          {item.status === "searching" && (
            <Button size="sm" variant="outline" className="w-full mt-1 text-xs" asChild>
              <span>
                <Search className="h-3 w-3 mr-1" /> View Matches
              </span>
            </Button>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  const messages: Record<Tab, string> = {
    searching: "No items currently being searched.",
    found:     "None of your lost items have been marked as found yet.",
    closed:    "No closed or deleted items.",
  };
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <MapPin className="h-12 w-12 text-muted-foreground/40 mb-4" />
      <h3 className="font-semibold text-lg mb-1">Nothing here</h3>
      <p className="text-muted-foreground text-sm mb-4">{messages[tab]}</p>
      {tab === "searching" && (
        <Button asChild>
          <Link to="/items/lost/new">
            <Plus className="h-4 w-4 mr-2" />
            Report Lost Item
          </Link>
        </Button>
      )}
    </div>
  );
}
