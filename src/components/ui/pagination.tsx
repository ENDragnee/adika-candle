"use client";

import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  // With these, the control also shows "21–40 of 132" and a rows-per-page
  // choice (Epic 22). Without them it's the plain page stepper.
  total?: number;
  pageSize?: number;
  onPageSizeChange?: (pageSize: number) => void;
}

// Page numbers to show: always the first and last, the current page and
// its neighbours, with "…" for the gaps — e.g. 1 … 4 5 6 … 12.
export function PageWindow(page: number, totalPages: number): (number | "…")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...pages]
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((a, b) => a - b);
  const result: (number | "…")[] = [];
  sorted.forEach((value, index) => {
    if (index > 0 && value - sorted[index - 1] > 1) result.push("…");
    result.push(value);
  });
  return result;
}

// The one pagination control (Epic 22) for every offset-paginated list:
// range text, numbered pages (desktop) or "3 / 7" (phone), previous/next,
// and rows-per-page. Renders nothing when there's a single page and no
// page-size choice to offer.
export function Pagination({
  page,
  totalPages,
  onPageChange,
  total,
  pageSize,
  onPageSizeChange,
}: PaginationProps) {
  const showSize =
    onPageSizeChange !== undefined &&
    pageSize !== undefined &&
    total !== undefined &&
    total > PAGE_SIZE_OPTIONS[0];
  if (totalPages <= 1 && !showSize) return null;

  const first = total && pageSize ? (page - 1) * pageSize + 1 : null;
  const last = total && pageSize ? Math.min(page * pageSize, total) : null;

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 pt-1"
    >
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        {first !== null && last !== null && total !== undefined && (
          <span className="tabular-nums">
            {FormatNumber(first, 0)}–{FormatNumber(last, 0)} of{" "}
            {FormatNumber(total, 0)}
          </span>
        )}
        {showSize && (
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger
              size="sm"
              className="w-[7.5rem]"
              aria-label="Rows per page"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option} per page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Previous page"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <CaretLeftIcon />
          </Button>
          <span className="px-2 text-sm text-muted-foreground tabular-nums sm:hidden">
            {page} / {totalPages}
          </span>
          <div className="hidden items-center gap-1 sm:flex">
            {PageWindow(page, totalPages).map((item, index) =>
              item === "…" ? (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: gaps have no identity of their own
                  key={`gap-${index}`}
                  className="px-1 text-muted-foreground"
                >
                  …
                </span>
              ) : (
                <Button
                  key={item}
                  type="button"
                  variant={item === page ? "default" : "ghost"}
                  size="icon-sm"
                  aria-label={`Page ${item}`}
                  aria-current={item === page ? "page" : undefined}
                  className={cn(
                    "tabular-nums",
                    item !== page && "text-muted-foreground",
                  )}
                  onClick={() => onPageChange(item)}
                >
                  {item}
                </Button>
              ),
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Next page"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            <CaretRightIcon />
          </Button>
        </div>
      )}
    </nav>
  );
}
