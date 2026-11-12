"use client";

// /ssr entry: no React context, so TableSkeleton stays importable from
// Server Components (the route loading.tsx files).
import {
  CaretDownIcon,
  CaretUpDownIcon,
  CaretUpIcon,
} from "@phosphor-icons/react/ssr";
import type * as React from "react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination, type PaginationProps } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// Shared outer chrome (rounded + bordered container) for tables whose rows
// are stateful components (inline edit toggles, per-row mutations) and so
// can't go through the generic DataTable<T> below — compose Table/
// TableHeader/TableBody/TableRow/TableCell from "@/components/ui/table"
// directly inside this instead of hand-rolling the border/rounding again.
// `overflow-x-auto` keeps these usable on narrow screens (they stay real
// tables at every width — see docs/DECISIONS.md for why only the generic
// DataTable<T> below gets a mobile card view).
export function TableContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto overflow-y-hidden rounded-xl border border-border">
      {children}
    </div>
  );
}

export interface DataTableColumn<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
  // Makes the header a sort toggle (Epic 21) when the table has `sort`.
  // The key is sent to the server — lists are paginated server-side, so
  // sorting one page client-side would only reorder 20 rows.
  sortKey?: string;
}

export type SortDirection = "asc" | "desc";

export interface DataTableSort {
  key: string;
  dir: SortDirection;
  onChange: (key: string, dir: SortDirection) => void;
}

// Exported for the composed (non-DataTable) tables that still want a
// sortable header cell.
export function SortableHeaderButton({
  label,
  sortKey,
  sort,
}: {
  label: string;
  sortKey: string;
  sort: DataTableSort;
}) {
  const isActive = sort.key === sortKey;
  const Icon = !isActive
    ? CaretUpDownIcon
    : sort.dir === "asc"
      ? CaretUpIcon
      : CaretDownIcon;
  return (
    <button
      type="button"
      className={cn(
        "-mx-1 inline-flex items-center gap-1 rounded px-1 hover:text-foreground",
        isActive ? "text-foreground" : "text-muted-foreground",
      )}
      onClick={() =>
        sort.onChange(sortKey, isActive && sort.dir === "asc" ? "desc" : "asc")
      }
      aria-label={`Sort by ${label}`}
    >
      {label}
      <Icon className="size-3" weight="bold" />
    </button>
  );
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowKey: (row: T) => string;
  emptyMessage: string;
  pagination?: PaginationProps;
  sort?: DataTableSort;
  // Page an already-loaded array in the browser (Epic 22) — for tables
  // computed in memory, like the Analytics reports, that have no server
  // pagination to drive. Ignored when `pagination` is given.
  clientPageSize?: number;
}

// Shared table shell every list component in src/features uses — gives a
// rounded/bordered container and hover-row state for free from the
// shadcn table.tsx primitives, instead of each feature hand-rolling the
// same <table>/border/bg-muted markup. See docs/DECISIONS.md, "Epic 9
// decisions".
//
// Below `lg` (Epic 22; was `md`), renders as per-row Cards instead of a
// table — one column on phones, two on tablets — the structured `columns` array (header + cell per field) gives
// us everything needed to do this centrally, so no call site needs to
// change. The first column becomes each card's title; the rest render as
// a label/value list matching the existing ProductOverview/CustomerHeader
// "dl" convention. See docs/DECISIONS.md, "mobile shell" decisions.
export function DataTable<T>({
  columns,
  data: allData,
  getRowKey,
  emptyMessage,
  pagination,
  sort,
  clientPageSize,
}: DataTableProps<T>) {
  const client = useClientPaging(
    pagination ? undefined : clientPageSize,
    allData,
  );
  const data = client.rows;
  const paginationProps = pagination ?? client.pagination;
  const [titleColumn, ...otherColumns] = columns;
  // A column with no header (row actions like the "⋯" menu) goes in the
  // card's header next to its title instead of an unlabeled row.
  const actionColumns = otherColumns.filter((column) => !column.header);
  const restColumns = otherColumns.filter((column) => column.header);

  return (
    <div className="flex flex-col gap-3">
      <div className="hidden lg:block">
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {columns.map((column) => (
                  <TableHead
                    key={column.key}
                    className={cn("bg-muted/50", column.className)}
                    aria-sort={
                      sort && column.sortKey && sort.key === column.sortKey
                        ? sort.dir === "asc"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                  >
                    {sort && column.sortKey ? (
                      <SortableHeaderButton
                        label={column.header}
                        sortKey={column.sortKey}
                        sort={sort}
                      />
                    ) : (
                      column.header
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length ? (
                data.map((row) => (
                  <TableRow key={getRowKey(row)}>
                    {columns.map((column) => (
                      <TableCell key={column.key} className={column.className}>
                        {column.cell(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:hidden">
        {data.length ? (
          data.map((row) => (
            <Card key={getRowKey(row)}>
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <CardTitle className="min-w-0">
                  {titleColumn.cell(row)}
                </CardTitle>
                {actionColumns.map((column) => (
                  <div key={column.key} className="-mt-1 -mr-2 shrink-0">
                    {column.cell(row)}
                  </div>
                ))}
              </CardHeader>
              {restColumns.length > 0 && (
                <CardContent>
                  <dl className="flex flex-col gap-2">
                    {restColumns.map((column) => (
                      <div
                        key={column.key}
                        className="flex justify-between gap-4 border-b border-border pb-2 last:border-b-0"
                      >
                        <dt className="shrink-0 text-muted-foreground">
                          {column.header}
                        </dt>
                        <dd className={cn("text-right", column.className)}>
                          {column.cell(row)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              )}
            </Card>
          ))
        ) : (
          <p className="py-8 text-center text-muted-foreground md:col-span-2">
            {emptyMessage}
          </p>
        )}
      </div>
      {paginationProps && <Pagination {...paginationProps} />}
    </div>
  );
}

function useClientPaging<T>(initialPageSize: number | undefined, data: T[]) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize ?? 0);
  // A new filter/sort upstream can shrink the list below the current
  // page; fall back to the last page that exists.
  const totalPages = pageSize
    ? Math.max(1, Math.ceil(data.length / pageSize))
    : 1;
  const current = Math.min(page, totalPages);

  if (!initialPageSize) {
    return { rows: data, pagination: undefined };
  }
  return {
    rows: data.slice((current - 1) * pageSize, current * pageSize),
    pagination: {
      page: current,
      totalPages,
      total: data.length,
      pageSize,
      onPageChange: setPage,
      onPageSizeChange: (next: number) => {
        setPageSize(next);
        setPage(1);
      },
    } satisfies PaginationProps,
  };
}

const DEFAULT_SKELETON_ROWS = 5;

// Loading placeholder for both DataTable<T> call sites and the 4
// composed-table files (category/customer/unit-conversion/user-manager) —
// same TableContainer/Table chrome as the real table so there's no layout
// jump when data swaps in. Callers pass their real column count (often
// `columns.length` from an existing DataTableColumn[] array) so the
// skeleton's column count always matches what renders after loading. See
// docs/DECISIONS.md, "Epic 10 decisions" for the default row-count choice.
//
// `mobileCard` (default true) renders a matching mobile card-skeleton
// below `md`, for callers whose real loaded content is DataTable<T>'s
// card view. The 4 composed-table files pass `mobileCard={false}` since
// their real content stays a table at every width.
export function TableSkeleton({
  columns,
  rows = DEFAULT_SKELETON_ROWS,
  mobileCard = true,
}: {
  columns: number;
  rows?: number;
  mobileCard?: boolean;
}) {
  return (
    <>
      <div className={mobileCard ? "hidden lg:block" : undefined}>
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {Array.from({ length: columns }, (_, index) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: static column count, never reordered
                  <TableHead key={index} className="bg-muted/50">
                    <Skeleton className="h-4 w-20" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: rows }, (_, rowIndex) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static row count, never reordered
                <TableRow key={rowIndex} className="hover:bg-transparent">
                  {Array.from({ length: columns }, (_, colIndex) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: static column count, never reordered
                    <TableCell key={colIndex}>
                      <Skeleton className="h-4 w-full max-w-32" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
      {mobileCard && (
        <div className="grid gap-3 md:grid-cols-2 lg:hidden">
          {Array.from({ length: rows }, (_, rowIndex) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static row count, never reordered
            <Card key={rowIndex}>
              <CardHeader>
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              {columns > 1 && (
                <CardContent>
                  <dl className="flex flex-col gap-2">
                    {Array.from({ length: columns - 1 }, (_, fieldIndex) => (
                      <div
                        // biome-ignore lint/suspicious/noArrayIndexKey: static field count, never reordered
                        key={fieldIndex}
                        className="flex justify-between gap-4 border-b border-border pb-2 last:border-b-0"
                      >
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    ))}
                  </dl>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
