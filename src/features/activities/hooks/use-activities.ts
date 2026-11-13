"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  FetchActivities,
  FetchActivityFacets,
} from "../services/activity.service";
import type { ActivityQuery } from "../validators/activity.schema";

type Filters = Omit<ActivityQuery, "cursor" | "limit">;

// Cursor-paginated (Epic 22): each page asks for the rows after the
// previous page's last one, so new activity arriving at the top never
// shifts or duplicates what's already loaded.
export function useActivities(filters: Filters) {
  return useInfiniteQuery({
    queryKey: ["activities", filters] as const,
    queryFn: ({ pageParam }) =>
      FetchActivities({ ...filters, cursor: pageParam, limit: 30 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    meta: { errorTitle: "Couldn't load more activity" },
  });
}

export function useActivityFacets() {
  return useQuery({
    queryKey: ["activities", "facets"] as const,
    queryFn: FetchActivityFacets,
    staleTime: 5 * 60 * 1000,
  });
}
