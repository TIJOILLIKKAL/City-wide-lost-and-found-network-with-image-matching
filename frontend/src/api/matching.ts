import { apiClient } from "./client";
import type { MatchResult } from "@/types";

export const matchingApi = {
  getMatches: (itemType: "found" | "lost", itemId: string) =>
    apiClient
      .get<{ results: MatchResult[]; source: "cache" | "live" }>(`/matching/${itemType}/${itemId}/matches/`)
      .then((r) => r.data),

  searchByImage: (formData: FormData) =>
    apiClient
      .post<{ results: MatchResult[]; total: number }>("/matching/search/image/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data),

  searchByText: (query: string, itemType: "found" | "lost", category?: string, topK = 10) =>
    apiClient
      .post<{ results: MatchResult[]; total: number }>("/matching/search/text/", {
        query,
        item_type: itemType,
        category,
        top_k: topK,
      })
      .then((r) => r.data),
};
