"use client";

import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  type Icon,
} from "@phosphor-icons/react";
import Link from "next/link";
import type * as React from "react";
import { useCountUp } from "@/components/motion/use-count-up";
import { Card, CardContent } from "@/components/ui/card";
import { EMPTY_VALUE, FormatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

function CountUpValue({
  value,
  format,
}: {
  value: number;
  format: (value: number) => string;
}) {
  const ref = useCountUp(value, { format });
  return <span ref={ref}>{format(value)}</span>;
}

// Change vs. a comparison value, as "+12.5% vs yesterday". Up isn't
// always good (e.g. debt), so the caller says which direction is good.
function DeltaLine({
  current,
  previous,
  label,
  upIsGood,
}: {
  current: number;
  previous: number;
  label: string;
  upIsGood: boolean;
}) {
  if (previous === 0) {
    return (
      <span className="text-xs text-muted-foreground">
        {current === 0 ? `Same as ${label}` : `None ${label}`}
      </span>
    );
  }
  const percent = ((current - previous) / Math.abs(previous)) * 100;
  const isUp = percent > 0;
  const isGood = percent === 0 ? null : isUp === upIsGood;
  const Arrow = isUp ? ArrowUpRightIcon : ArrowDownRightIcon;
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      {percent !== 0 && (
        <Arrow
          weight="bold"
          className="size-3"
          style={{
            color: isGood
              ? "var(--color-status-good)"
              : "var(--color-status-critical)",
          }}
        />
      )}
      <span className="font-medium text-foreground tabular-nums">
        {FormatPercent(percent, { signed: true })}
      </span>
      vs {label}
    </span>
  );
}

// Epic 16/17 stat tile, extended in Epic 21: a null value renders as "—"
// (not computable — e.g. profit with no cost data) instead of 0, and a
// tile can carry an icon, a hint line, a delta vs. a comparison value,
// and a link to the page that explains the number.
export function StatTile({
  label,
  value,
  format = (n: number) => Math.round(n).toLocaleString(),
  icon: IconComponent,
  hint,
  delta,
  href,
  className,
}: {
  label: string;
  value: number | null;
  format?: (value: number) => string;
  icon?: Icon;
  hint?: React.ReactNode;
  delta?: { previous: number; label: string; upIsGood?: boolean };
  href?: string;
  className?: string;
}) {
  const content = (
    <Card
      className={cn(
        "h-full",
        href && "transition-colors hover:bg-muted/40",
        className,
      )}
    >
      <CardContent className="flex h-full flex-col gap-1.5">
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {IconComponent && <IconComponent className="size-4" />}
          {label}
        </span>
        <span className="text-2xl font-semibold tracking-tight tabular-nums">
          {value === null ? (
            EMPTY_VALUE
          ) : (
            <CountUpValue value={value} format={format} />
          )}
        </span>
        {delta && value !== null && (
          <DeltaLine
            current={value}
            previous={delta.previous}
            label={delta.label}
            upIsGood={delta.upIsGood ?? true}
          />
        )}
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </CardContent>
    </Card>
  );

  return href ? (
    <Link
      href={href}
      className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {content}
    </Link>
  ) : (
    content
  );
}
