import type * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
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
}

interface DataTablePagination {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowKey: (row: T) => string;
  emptyMessage: string;
  pagination?: DataTablePagination;
}

// Shared table shell every list component in src/features uses — gives a
// rounded/bordered container and hover-row state for free from the
// shadcn table.tsx primitives, instead of each feature hand-rolling the
// same <table>/border/bg-muted markup. See docs/DECISIONS.md, "Epic 9
// decisions".
//
// Below `md`, renders as a stacked list of per-row Cards instead of a
// table — the structured `columns` array (header + cell per field) gives
// us everything needed to do this centrally, so no call site needs to
// change. The first column becomes each card's title; the rest render as
// a label/value list matching the existing ProductOverview/CustomerHeader
// "dl" convention. See docs/DECISIONS.md, "mobile shell" decisions.
export function DataTable<T>({
  columns,
  data,
  getRowKey,
  emptyMessage,
  pagination,
}: DataTableProps<T>) {
  const [titleColumn, ...restColumns] = columns;

  return (
    <div className="flex flex-col gap-3">
      <div className="hidden md:block">
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {columns.map((column) => (
                  <TableHead
                    key={column.key}
                    className={cn("bg-muted/50", column.className)}
                  >
                    {column.header}
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
      <div className="flex flex-col gap-3 md:hidden">
        {data.length ? (
          data.map((row) => (
            <Card key={getRowKey(row)}>
              <CardHeader>
                <CardTitle>{titleColumn.cell(row)}</CardTitle>
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
          <p className="py-8 text-center text-muted-foreground">
            {emptyMessage}
          </p>
        )}
      </div>
      {pagination && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={pagination.onPageChange}
        />
      )}
    </div>
  );
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
      <div className={mobileCard ? "hidden md:block" : undefined}>
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
        <div className="flex flex-col gap-3 md:hidden">
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
