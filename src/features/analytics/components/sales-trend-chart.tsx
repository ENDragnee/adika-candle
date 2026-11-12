"use client";

import { useState } from "react";
import { MOTION } from "@/components/motion/motion-tokens";
import { useChartEntrance } from "@/components/motion/use-chart-entrance";
import { Skeleton } from "@/components/ui/skeleton";
import { BuildLinearScale, XLabelIndices } from "./chart-scale";


const CHART_HEIGHT_PX = 160;
const Y_AXIS_WIDTH_PX = 48;

export interface BarSeries {
  key: string;
  label: string;
  color: string;
}

export interface BarPoint {
  key: string;
  label: string;
  values: Record<string, number>;
  // Extra tooltip line, e.g. "3 sales".
  detail?: string;
}

// Hand-built stacked bar chart (no charting dependency — see
// docs/DECISIONS.md, "Epic 17 decisions"). Epic 21 added a value axis
// with nice ticks, spaced date labels, up to two stacked series (with the
// dataviz skill's 2px surface gap between segments and a legend for 2+
// series), and a tooltip that lists every series plus the total.
export function StackedBarChart({
  points,
  series,
  valueFormatter,
  axisFormatter,
  emptyMessage = "No data in this period.",
}: {
  points: BarPoint[];
  series: BarSeries[];
  valueFormatter: (value: number) => string;
  axisFormatter: (value: number) => string;
  emptyMessage?: string;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const hasEntered = useChartEntrance(points.length > 0);

  const totals = points.map((point) =>
    series.reduce((sum, item) => sum + (point.values[item.key] ?? 0), 0),
  );
  const isEmpty = totals.every((total) => total === 0);
  const scale = BuildLinearScale(totals);
  const hovered = hoveredIndex !== null ? points[hoveredIndex] : null;
  const labelIndices = new Set(XLabelIndices(points.length));

  return (
    <div className="flex flex-col gap-2">
      {series.length >= 2 && (
        <div className="flex flex-wrap gap-4 text-xs">
          {series.map((item) => (
            <div key={item.key} className="flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-[3px]"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      )}
      {/* Top padding keeps the highest tick label clear of the legend. */}
      <div className="flex pt-2">
        <div
          className="relative shrink-0 text-[11px] text-muted-foreground tabular-nums"
          style={{ width: Y_AXIS_WIDTH_PX, height: CHART_HEIGHT_PX }}
          aria-hidden="true"
        >
          {(isEmpty ? [] : scale.ticks).map((tick) => (
            <span
              key={tick}
              className="absolute right-2 -translate-y-1/2"
              style={{
                bottom: `calc(${scale.toFraction(tick) * 100}% - 0.5em)`,
              }}
            >
              {axisFormatter(tick)}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative" style={{ height: CHART_HEIGHT_PX }}>
            {scale.ticks.map((tick) => (
              <div
                key={tick}
                className="absolute inset-x-0 border-t border-border/70"
                style={{ bottom: `${scale.toFraction(tick) * 100}%` }}
              />
            ))}
            {isEmpty && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                {emptyMessage}
              </div>
            )}
            {hovered && hoveredIndex !== null && (
              <div
                className="pointer-events-none absolute top-0 z-10 min-w-36 -translate-x-1/2 -translate-y-full rounded-lg bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md ring-1 ring-foreground/10"
                style={{
                  left: `clamp(4.5rem, ${(hoveredIndex + 0.5) * (100 / points.length)}%, calc(100% - 4.5rem))`,
                }}
              >
                <div className="mb-1 font-medium text-foreground">
                  {hovered.label}
                </div>
                {series.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between gap-3 text-muted-foreground"
                  >
                    <span className="flex items-center gap-1.5">
                      <span
                        className="size-2 rounded-[2px]"
                        style={{ backgroundColor: item.color }}
                      />
                      {item.label}
                    </span>
                    <span className="tabular-nums text-foreground">
                      {valueFormatter(hovered.values[item.key] ?? 0)}
                    </span>
                  </div>
                ))}
                {series.length >= 2 && (
                  <div className="mt-1 flex justify-between gap-3 border-t border-border pt-1 font-medium text-foreground">
                    <span>Total</span>
                    <span className="tabular-nums">
                      {valueFormatter(totals[hoveredIndex])}
                    </span>
                  </div>
                )}
                {hovered.detail && (
                  <div className="mt-0.5 text-muted-foreground">
                    {hovered.detail}
                  </div>
                )}
              </div>
            )}
            <div
              className="absolute inset-0 grid items-end"
              style={{
                gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))`,
              }}
            >
              {points.map((point, index) => {
                const total = totals[index];
                const heightPercent =
                  scale.toFraction(total) * 100 - scale.toFraction(0) * 100;
                const isHovered = hoveredIndex === index;
                const nonZero = series.filter(
                  (item) => (point.values[item.key] ?? 0) > 0,
                );

                return (
                  <button
                    key={point.key}
                    type="button"
                    className="flex h-full items-end justify-center px-px outline-none focus-visible:bg-muted/60"
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    onFocus={() => setHoveredIndex(index)}
                    onBlur={() => setHoveredIndex(null)}
                    aria-label={`${point.label}: ${series
                      .map(
                        (item) =>
                          `${item.label} ${valueFormatter(point.values[item.key] ?? 0)}`,
                      )
                      .join(", ")}${point.detail ? `, ${point.detail}` : ""}`}
                  >
                    <span
                      className="flex w-full max-w-6 flex-col-reverse gap-[2px] overflow-hidden rounded-t-[4px]"
                      style={{
                        height: `${Math.max(heightPercent, 0)}%`,
                        minHeight: total > 0 ? 2 : 0,
                        opacity: hoveredIndex === null || isHovered ? 1 : 0.55,
                        // Entrance: composite-only scaleY from the baseline
                        // (Epic 16). After that, a refetch eases the bar's
                        // height to its new value instead of jumping.
                        transform: hasEntered ? "scaleY(1)" : "scaleY(0)",
                        transformOrigin: "bottom",
                        transitionProperty: "opacity, transform, height",
                        transitionDuration: `150ms, ${MOTION.barEnterMs}ms, ${MOTION.updateMs}ms`,
                        transitionTimingFunction: `ease, ${MOTION.easeOut}, ${MOTION.easeOut}`,
                        transitionDelay: `0ms, ${Math.min(index * MOTION.barStaggerMs, MOTION.barStaggerCapMs)}ms, 0ms`,
                      }}
                    >
                      {nonZero.map((item) => (
                        <span
                          key={item.key}
                          className="w-full shrink-0"
                          style={{
                            flexGrow: point.values[item.key] ?? 0,
                            flexBasis: 0,
                            backgroundColor: item.color,
                          }}
                        />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div
            className="relative mt-1.5 h-4 text-[11px] text-muted-foreground"
            aria-hidden="true"
          >
            {points.map((point, index) =>
              labelIndices.has(index) ? (
                <span
                  key={point.key}
                  className="absolute top-1 whitespace-nowrap"
                  style={{
                    left: `${((index + 0.5) / points.length) * 100}%`,
                    transform:
                      index === 0
                        ? "translateX(-25%)"
                        : index === points.length - 1
                          ? "translateX(-75%)"
                          : "translateX(-50%)",
                  }}
                >
                  {point.label}
                </span>
              ) : null,
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const SKELETON_BAR_COUNT = 30;
const SKELETON_BAR_HEIGHTS_PERCENT = Array.from(
  { length: SKELETON_BAR_COUNT },
  (_, index) => 30 + ((index * 17) % 60),
);

// Bar-shaped loading state, so the chart area doesn't collapse to a blank
// rectangle while its query is in flight.
export function SalesTrendChartSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex">
        <div style={{ width: Y_AXIS_WIDTH_PX }} />
        <div
          className="grid flex-1 items-end border-b border-border"
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
      </div>
    </div>
  );
}
