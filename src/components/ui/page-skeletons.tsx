import type * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TableSkeleton } from "@/components/ui/data-table";
import { CardSkeleton, Skeleton } from "@/components/ui/skeleton";

// Route-level loading states (Epic 22), rendered by each route's
// loading.tsx while the server checks the session and renders the page.
// Before, navigation showed nothing at all for that moment. Each matches
// the shape of the page it stands in for, so nothing jumps when it swaps.

// <output> is the native live region for status content, so assistive
// tech hears "Loading" once rather than every placeholder bar.
function LoadingRegion({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return (
    <output aria-busy="true" aria-label="Loading" className={className}>
      {children}
    </output>
  );
}

function Toolbar({ actions = 1 }: { actions?: number }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Skeleton className="h-9 w-full sm:w-64" />
      <div className="flex gap-2">
        {Array.from({ length: actions }, (_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static count, never reordered
          <Skeleton key={index} className="h-9 w-24" />
        ))}
      </div>
    </div>
  );
}

function Tiles({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static count, never reordered
        <CardSkeleton key={index} />
      ))}
    </div>
  );
}

function ChartBlock({ height = 200 }: { height?: number }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="w-full" style={{ height }} />
      </CardContent>
    </Card>
  );
}

// A list page: search/filter toolbar + table.
export function ListPageSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <LoadingRegion className="flex flex-col gap-4">
      <Toolbar />
      <TableSkeleton columns={columns} rows={8} />
    </LoadingRegion>
  );
}

// A list with a totals/summary row on top (Sales, Loans).
export function SummaryListPageSkeleton({ columns = 6 }: { columns?: number }) {
  return (
    <LoadingRegion className="flex flex-col gap-4">
      <Tiles count={3} />
      <Toolbar actions={2} />
      <TableSkeleton columns={columns} rows={8} />
    </LoadingRegion>
  );
}

export function DashboardPageSkeleton() {
  return (
    <LoadingRegion className="flex flex-col gap-8">
      <Tiles count={4} />
      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <ChartBlock height={180} />
        </div>
        <div className="flex flex-col gap-2 lg:col-span-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    </LoadingRegion>
  );
}

export function AnalyticsPageSkeleton() {
  return (
    <LoadingRegion className="flex flex-col gap-6">
      <Skeleton className="h-9 w-full max-w-md" />
      <Tiles count={4} />
      <ChartBlock />
      <TableSkeleton columns={6} />
    </LoadingRegion>
  );
}

// A record's page: summary cards, tab strip, history table.
export function DetailPageSkeleton() {
  return (
    <LoadingRegion className="flex flex-col gap-6">
      <Tiles count={4} />
      <Skeleton className="h-9 w-full max-w-sm" />
      <TableSkeleton columns={5} rows={6} />
    </LoadingRegion>
  );
}

// Settings/roles-style pages: a short list of panels.
export function PanelsPageSkeleton() {
  return (
    <LoadingRegion className="flex flex-col gap-3">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </LoadingRegion>
  );
}
