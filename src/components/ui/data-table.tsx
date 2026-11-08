import type * as React from "react";
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
export function TableContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
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

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowKey: (row: T) => string;
  emptyMessage: string;
}

// Shared table shell every list component in src/features uses — gives a
// rounded/bordered container and hover-row state for free from the
// shadcn table.tsx primitives, instead of each feature hand-rolling the
// same <table>/border/bg-muted markup. See docs/DECISIONS.md, "Epic 9
// decisions".
export function DataTable<T>({
  columns,
  data,
  getRowKey,
  emptyMessage,
}: DataTableProps<T>) {
  return (
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
  );
}
