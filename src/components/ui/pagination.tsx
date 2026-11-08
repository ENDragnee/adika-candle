"use client";

import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

// Previous / Page X of Y / Next — no numbered page buttons or ellipsis
// logic, matching this app's preference for the simplest control that
// works. Renders nothing at a single page, so small (in-scope but
// naturally small) lists never show a pointless disabled control.
export function Pagination({
  page,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-2 pt-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <CaretLeftIcon data-icon="inline-start" />
        Previous
      </Button>
      <span className="text-xs text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
        <CaretRightIcon data-icon="inline-end" />
      </Button>
    </div>
  );
}
