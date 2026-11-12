"use client";

import { useCallback, useState } from "react";
import type { PaginationProps } from "@/components/ui/pagination";
import { DEFAULT_PAGE_SIZE, type PaginationMeta } from "@/lib/pagination";

// Page + page-size state for an offset-paginated list (Epic 22). Spread
// `params` into the list's query hook and hand `Bind(result?.pagination)`
// to DataTable's `pagination` (or <Pagination {...}/> directly). Changing
// the page size goes back to page 1.
export function usePagination(defaultPageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(defaultPageSize);

  const setPageSize = useCallback((next: number) => {
    setPageSizeState(next);
    setPage(1);
  }, []);

  const Bind = (meta: PaginationMeta | undefined): PaginationProps => ({
    page,
    totalPages: meta?.totalPages ?? 1,
    total: meta?.total,
    pageSize,
    onPageChange: setPage,
    onPageSizeChange: setPageSize,
  });

  return {
    page,
    pageSize,
    setPage,
    setPageSize,
    params: { page, pageSize },
    Bind,
  };
}
