import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { itemsApi } from "@/api/items";
import type { LostItem } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { capitalize, fmtDate } from "@/lib/utils";

const statusBadge: Record<string, "default" | "success" | "warning" | "danger" | "info" | "neutral"> = {
  searching: "warning",
  matched: "info",
  resolved: "success",
};

const CATEGORIES = ["bag", "phone", "wallet", "keys", "clothing", "document", "electronics", "jewelry", "other"];

export function LostItemsPage() {
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const params: Record<string, string | number> = { page };
  if (categoryFilter) params.category = categoryFilter;
  if (statusFilter) params.status = statusFilter;

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ["admin-lost-items", categoryFilter, statusFilter, page],
    queryFn: () => itemsApi.listLost(params),
    placeholderData: (prev) => prev,
  });

  const totalPages = data ? data.total_pages : 1;
  const reset = () => setPage(1);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Lost Items</h1>
        <p className="text-sm text-gray-500">{data?.count ?? 0} total lost items</p>
      </div>

      <div className="flex gap-3">
        <Select className="w-40" value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); reset(); }}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{capitalize(c)}</option>)}
        </Select>
        <Select className="w-36" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); reset(); }}>
          <option value="">All statuses</option>
          <option value="searching">Searching</option>
          <option value="matched">Matched</option>
          <option value="resolved">Resolved</option>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Item</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Category</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Reporter ID</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Lost at</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Created</th>
                </tr>
              </thead>
              <tbody className={isPlaceholderData ? "opacity-60" : ""}>
                {isLoading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i}><td colSpan={6} className="px-4 py-3">
                        <div className="h-5 bg-gray-100 rounded animate-pulse" />
                      </td></tr>
                    ))
                  : data?.results.map((item: LostItem) => (
                      <tr key={item.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {item.image_url ? (
                              <img src={item.image_url} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0 bg-gray-100" />
                            ) : (
                              <div className="h-10 w-10 rounded-lg bg-gray-100 shrink-0" />
                            )}
                            <div>
                              <p className="font-medium text-gray-900">{item.title}</p>
                              <p className="text-xs text-gray-400 truncate max-w-[180px]">{item.description}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 capitalize">{capitalize(item.category)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{item.reported_by}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(item.lost_at)}</td>
                        <td className="px-4 py-3">
                          <Badge variant={statusBadge[item.status] ?? "neutral"}>{capitalize(item.status)}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(item.created_at)}</td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
