"use client";

import { useCallback, useState } from "react";
import type { SortDirection } from "@/lib/list-query";

// State for a server-paginated, searchable, sortable list (Epic 21):
// page + search + sort, where changing the search or sort goes back to
// page 1. Spread `params` into the list's query hook; hand `sort` to
// DataTable and `setSearch` to ListSearch.
export function useListParams<K extends string>(defaultSort: K) {
  const [page, setPage] = useState(1);
  const [search, setSearchState] = useState<string | undefined>(undefined);
  const [sortKey, setSortKey] = useState<K>(defaultSort);
  const [dir, setDir] = useState<SortDirection>("asc");

  const setSearch = useCallback((value: string | undefined) => {
    setSearchState(value);
    setPage(1);
  }, []);

  return {
    page,
    setPage,
    setSearch,
    params: { page, search, sort: sortKey, dir },
    sort: {
      key: sortKey as string,
      dir,
      onChange: (key: string, nextDir: SortDirection) => {
        setSortKey(key as K);
        setDir(nextDir);
        setPage(1);
      },
    },
  };
}
