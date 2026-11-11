import { cn } from "cn";
import { Card, CardContent } from "@/components/ui/card";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

// Matches StatTile's label + big number shape (see manager-dashboard.tsx).
function CardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardContent className="flex flex-col gap-1">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-7 w-16" />
      </CardContent>
    </Card>
  );
}

// Generic key-value `dl` panel skeleton — matches ProductOverview/
// CustomerHeader's "label right-aligned value, border-b between rows" shape.
function DetailSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <dl className="flex max-w-sm flex-col gap-2">
      {Array.from({ length: rows }, (_, index) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: static row count, never reordered
          key={index}
          className="flex justify-between border-b border-border pb-2 last:border-b-0"
        >
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </dl>
  );
}

export { Skeleton, CardSkeleton, DetailSkeleton };
