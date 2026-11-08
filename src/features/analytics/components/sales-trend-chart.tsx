"use client";

import { useState } from "react";
import { useChartEntrance } from "@/components/motion/use-chart-entrance";
import { Skeleton } from "@/components/ui/skeleton";
import type { SalesTrendPointDTO } from "../validators/analytics.schema";

// Capped per-bar stagger (animation-performance skill: 30-80ms stagger
// band, capped so a 30-bar chart doesn't stretch the whole reveal past
// ~1s) — see docs/DECISIONS.md for the Epic 16 entrance-pattern writeup.
const BAR_ENTRANCE_DURATION_MS = 320;
const BAR_STAGGER_STEP_MS = 6;
const BAR_STAGGER_CAP_MS = 220;

const CHART_HEIGHT_PX = 140;

// Deterministic varied bar heights (not Math.random — this is purely
// decorative, and a fixed pattern avoids any hydration-timing flakiness)
// matching the real chart's 30-day point count.
const SKELETON_BAR_COUNT = 30;
const SKELETON_BAR_HEIGHTS_PERCENT = Array.from(
  { length: SKELETON_BAR_COUNT },
  (_, index) => 30 + ((index * 17) % 60),
);

function FormatShortDate(dateKey: string) {
  if (!dateKey) return "";
  return new Date(`${dateKey}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// Single series (daily sales total) — no legend box per the dataviz
// skill's "a single series needs no legend box" rule; the card title names
// what's plotted.
export function SalesTrendChart({ points }: { points: SalesTrendPointDTO[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const hasEntered = useChartEntrance();

  if (points.length === 0) {
    return <p className="text-sm text-muted-foreground">No sales data yet.</p>;
  }

  const maxAmount = Math.max(
    1,
    ...points.map((point) => Number(point.totalAmount)),
  );
  const hovered = hoveredIndex !== null ? points[hoveredIndex] : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        {hovered && (
          <div
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-popover px-2 py-1 text-xs text-popover-foreground ring-1 ring-foreground/10 shadow-md"
            style={{
              left: `${((hoveredIndex ?? 0) + 0.5) * (100 / points.length)}%`,
            }}
          >
            <div className="font-medium text-foreground tabular-nums">
              {hovered.totalAmount}
            </div>
            <div className="text-muted-foreground">
              {FormatShortDate(hovered.date)} · {hovered.saleCount}{" "}
              {hovered.saleCount === 1 ? "sale" : "sales"}
            </div>
          </div>
        )}
        <div
          className="grid items-end border-b border-border"
          style={{
            height: CHART_HEIGHT_PX,
            gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))`,
          }}
        >
          {points.map((point, index) => {
            const amount = Number(point.totalAmount);
            const heightPercent = Math.max((amount / maxAmount) * 100, 0);
            const isHovered = hoveredIndex === index;

            return (
              <div
                key={point.date}
                className="flex h-full items-end justify-center px-px"
              >
                <button
                  type="button"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onFocus={() => setHoveredIndex(index)}
                  onBlur={() => setHoveredIndex(null)}
                  aria-label={`${FormatShortDate(point.date)}: ${point.totalAmount}, ${point.saleCount} sale(s)`}
                  className={`w-full max-w-6 min-h-0.5 rounded-t-[4px] outline-none ${
                    isHovered ? "bg-foreground" : "bg-chart-3"
                  }`}
                  style={{
                    height: `${heightPercent}%`,
                    minHeight: 2,
                    // Composite-only entrance: scaleY from a zero baseline
                    // (transform-origin: bottom) rather than animating
                    // `height` itself, which is already set to its final
                    // value above — see animation-performance skill and
                    // docs/DECISIONS.md's Epic 16 writeup.
                    transform: hasEntered ? "scaleY(1)" : "scaleY(0)",
                    transformOrigin: "bottom",
                    transitionProperty: "background-color, transform",
                    transitionDuration: `150ms, ${BAR_ENTRANCE_DURATION_MS}ms`,
                    transitionTimingFunction:
                      "ease, cubic-bezier(0.23, 1, 0.32, 1)",
                    transitionDelay: `0ms, ${Math.min(index * BAR_STAGGER_STEP_MS, BAR_STAGGER_CAP_MS)}ms`,
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{FormatShortDate(points[0]?.date ?? "")}</span>
        <span>{FormatShortDate(points[points.length - 1]?.date ?? "")}</span>
      </div>
    </div>
  );
}

// Standalone skeleton for SalesTrendChart's loading state — bar shapes, not
// a generic block, so the dashboard's chart section doesn't collapse to a
// blank rectangle while `useManagerDashboard` is in flight.
export function SalesTrendChartSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <div
        className="grid items-end border-b border-border"
        style={{
          height: CHART_HEIGHT_PX,
          gridTemplateColumns: `repeat(${SKELETON_BAR_HEIGHTS_PERCENT.length}, minmax(0, 1fr))`,
        }}
      >
        {SKELETON_BAR_HEIGHTS_PERCENT.map((heightPercent, index) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: static bar count, never reordered
            key={index}
            className="flex h-full items-end justify-center px-px"
          >
            <Skeleton
              className="w-full max-w-6 rounded-t-[4px] rounded-b-none"
              style={{ height: `${heightPercent}%` }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  );
}
