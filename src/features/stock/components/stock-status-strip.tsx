"use client";

import Link from "next/link";
import { useChartEntrance } from "@/components/motion/use-chart-entrance";
import { ToneColor } from "@/components/ui/tone-badge";
import { cn } from "@/lib/utils";
import { STOCK_STATUSES, type StockStatus } from "../stock-status";
import { STOCK_STATUS_META } from "./stock-status-badge";

export interface StockStatusCount {
  status: StockStatus;
  count: number;
}

// Part-to-whole view of every active product's stock status (Epic 21): one
// 100%-wide segmented bar (proportions) plus a chip per status with its
// count. Chips either filter in place (`onSelect`) or link somewhere
// (`hrefFor`). Status colors always ship with an icon + label (dataviz
// skill), and the 2px surface gap separates adjacent segments.
export function StockStatusStrip({
  counts,
  selected,
  onSelect,
  hrefFor,
  hideEmpty = false,
}: {
  counts: StockStatusCount[];
  selected?: StockStatus | null;
  onSelect?: (status: StockStatus | null) => void;
  hrefFor?: (status: StockStatus) => string;
  hideEmpty?: boolean;
}) {
  const hasEntered = useChartEntrance(counts.length > 0);
  const byStatus = new Map(counts.map((item) => [item.status, item.count]));
  const total = counts.reduce((sum, item) => sum + item.count, 0);
  const ordered = STOCK_STATUSES.map((status) => ({
    status,
    count: byStatus.get(status) ?? 0,
  }));
  const chips = hideEmpty ? ordered.filter((item) => item.count > 0) : ordered;

  return (
    <div className="flex flex-col gap-3">
      <div
        className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={ordered
          .filter((item) => item.count > 0)
          .map(
            (item) => `${STOCK_STATUS_META[item.status].label}: ${item.count}`,
          )
          .join(", ")}
      >
        {total > 0 &&
          ordered
            .filter((item) => item.count > 0)
            .map((item) => (
              <span
                key={item.status}
                className={cn(
                  "h-full transition-opacity",
                  selected && selected !== item.status && "opacity-35",
                )}
                style={{
                  flexGrow: item.count,
                  backgroundColor: ToneColor(
                    STOCK_STATUS_META[item.status].tone,
                  ),
                  transform: hasEntered ? "scaleX(1)" : "scaleX(0)",
                  transformOrigin: "left",
                  transition:
                    "transform 420ms cubic-bezier(0.23, 1, 0.32, 1), opacity 150ms ease",
                }}
              />
            ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {chips.map((item) => {
          const meta = STOCK_STATUS_META[item.status];
          const Icon = meta.icon;
          const isSelected = selected === item.status;
          const body = (
            <>
              <Icon
                weight="fill"
                className="size-3.5"
                style={{ color: ToneColor(meta.tone) }}
              />
              <span>{meta.label}</span>
              <span className="font-semibold tabular-nums">{item.count}</span>
            </>
          );
          const className = cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
            isSelected
              ? "border-foreground/40 bg-muted"
              : "border-border hover:bg-muted/60",
            item.count === 0 && "text-muted-foreground",
          );

          if (hrefFor) {
            return (
              <Link
                key={item.status}
                href={hrefFor(item.status)}
                className={className}
                title={meta.description}
              >
                {body}
              </Link>
            );
          }
          if (onSelect) {
            return (
              <button
                key={item.status}
                type="button"
                className={className}
                title={meta.description}
                aria-pressed={isSelected}
                onClick={() => onSelect(isSelected ? null : item.status)}
              >
                {body}
              </button>
            );
          }
          return (
            <span
              key={item.status}
              className={className}
              title={meta.description}
            >
              {body}
            </span>
          );
        })}
      </div>
    </div>
  );
}
