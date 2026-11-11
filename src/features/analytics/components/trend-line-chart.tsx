"use client";

import { useState } from "react";
import { useChartEntrance } from "@/components/motion/use-chart-entrance";
import { BuildLinearScale, XLabelIndices } from "./chart-scale";

export interface TrendSeries {
  key: string;
  label: string;
  color: string;
}

export interface TrendPoint {
  key: string;
  label: string;
  // null = no data for that point (e.g. no costed sales that day). Drawn
  // as a gap, never as 0 — before Epic 21 a day with no sales plotted as
  // "0% margin".
  values: Record<string, number | null>;
}

const CHART_HEIGHT = 160;
const CHART_WIDTH = 600;
const Y_AXIS_WIDTH_PX = 48;
const PATH_DRAW_DURATION_MS = 500;

function BuildPath(
  points: TrendPoint[],
  key: string,
  xAt: (index: number) => number,
  yAt: (value: number) => number,
): string {
  let d = "";
  let penDown = false;
  points.forEach((point, index) => {
    const value = point.values[key];
    if (value === null || value === undefined) {
      penDown = false;
      return;
    }
    d += `${penDown ? "L" : "M"}${xAt(index).toFixed(2)},${yAt(value).toFixed(2)} `;
    penDown = true;
  });
  return d.trim();
}

// Hand-built SVG line chart (no charting dependency — see docs/DECISIONS.md,
// "Epic 17 decisions"). Up to two series; a legend only for 2 (a single
// series needs no legend box per the dataviz skill). Epic 21 added a value
// axis, gaps for missing data, isolated-point markers (a lone day between
// two gaps would otherwise be invisible), and spaced x labels.
export function TrendLineChart({
  points,
  series,
  valueFormatter = (value: number) => value.toFixed(1),
  axisFormatter = valueFormatter,
  emptyMessage = "No data in this period.",
}: {
  points: TrendPoint[];
  series: TrendSeries[];
  valueFormatter?: (value: number) => string;
  axisFormatter?: (value: number) => string;
  emptyMessage?: string;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const hasEntered = useChartEntrance(points.length > 0);

  const allValues = points.flatMap((point) =>
    series
      .map((item) => point.values[item.key])
      .filter(
        (value): value is number => value !== null && value !== undefined,
      ),
  );
  const isEmpty = allValues.length === 0;
  const scale = BuildLinearScale(allValues);
  const xStep = points.length > 1 ? CHART_WIDTH / (points.length - 1) : 0;
  const xAt = (index: number) =>
    points.length > 1 ? index * xStep : CHART_WIDTH / 2;
  const yAt = (value: number) =>
    CHART_HEIGHT - scale.toFraction(value) * CHART_HEIGHT;
  const xPercent = (index: number) => (xAt(index) / CHART_WIDTH) * 100;

  const hovered = hoveredIndex !== null ? points[hoveredIndex] : null;
  const labelIndices = new Set(XLabelIndices(points.length));

  const isolatedMarkers = series.flatMap((item) =>
    points.flatMap((point, index) => {
      const value = point.values[item.key];
      if (value === null || value === undefined) return [];
      const prev = points[index - 1]?.values[item.key];
      const next = points[index + 1]?.values[item.key];
      const isolated =
        (prev === null || prev === undefined) &&
        (next === null || next === undefined);
      return isolated || hoveredIndex === index ? [{ item, index, value }] : [];
    }),
  );

  return (
    <div className="flex flex-col gap-2">
      {series.length >= 2 && (
        <div className="flex flex-wrap gap-4 text-xs">
          {series.map((item) => (
            <div key={item.key} className="flex items-center gap-1.5">
              <span
                className="h-0.5 w-3 rounded-full"
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
          style={{ width: Y_AXIS_WIDTH_PX, height: CHART_HEIGHT }}
          aria-hidden="true"
        >
          {scale.ticks.map((tick) => (
            <span
              key={tick}
              className="absolute right-2 translate-y-1/2"
              style={{ bottom: `${scale.toFraction(tick) * 100}%` }}
            >
              {axisFormatter(tick)}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          {hovered && hoveredIndex !== null && (
            <div
              className="pointer-events-none absolute top-0 z-10 min-w-32 -translate-x-1/2 -translate-y-full rounded-lg bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md ring-1 ring-foreground/10"
              style={{
                left: `clamp(4rem, ${xPercent(hoveredIndex)}%, calc(100% - 4rem))`,
              }}
            >
              <div className="mb-1 font-medium text-foreground">
                {hovered.label}
              </div>
              {series.map((item) => {
                const value = hovered.values[item.key];
                return (
                  <div
                    key={item.key}
                    className="flex items-center justify-between gap-3 text-muted-foreground"
                  >
                    <span className="flex items-center gap-1.5">
                      <span
                        className="size-1.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      {item.label}
                    </span>
                    <span className="tabular-nums text-foreground">
                      {value === null || value === undefined
                        ? "No data"
                        : valueFormatter(value)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          {isEmpty && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              {emptyMessage}
            </div>
          )}
          <svg
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            className="w-full overflow-visible"
            style={{ height: CHART_HEIGHT }}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {scale.ticks.map((tick) => (
              <line
                key={tick}
                x1={0}
                x2={CHART_WIDTH}
                y1={yAt(tick)}
                y2={yAt(tick)}
                className={tick === 0 ? "stroke-border" : "stroke-border/60"}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {series.map((item) => (
              <path
                key={item.key}
                d={BuildPath(points, item.key, xAt, yAt)}
                fill="none"
                stroke={item.color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                pathLength={1}
                style={{
                  strokeDasharray: 1,
                  strokeDashoffset: hasEntered ? 0 : 1,
                  transition: `stroke-dashoffset ${PATH_DRAW_DURATION_MS}ms cubic-bezier(0.23, 1, 0.32, 1)`,
                }}
              />
            ))}
            {points.map((point, index) => (
              // biome-ignore lint/a11y/noStaticElementInteractions: mouse-only hover convenience inside a decorative (aria-hidden) chart; the same data is in the table below
              <rect
                key={point.key}
                x={xAt(index) - (xStep || CHART_WIDTH) / 2}
                y={0}
                width={xStep || CHART_WIDTH}
                height={CHART_HEIGHT}
                fill="transparent"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            ))}
            {hoveredIndex !== null && (
              <line
                x1={xAt(hoveredIndex)}
                x2={xAt(hoveredIndex)}
                y1={0}
                y2={CHART_HEIGHT}
                className="stroke-muted-foreground"
                strokeWidth={1}
                strokeDasharray="2,2"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>
          {/* Markers as HTML, so they stay round under the SVG's
              non-uniform (preserveAspectRatio="none") scaling. */}
          {isolatedMarkers.map(({ item, index, value }) => (
            <span
              key={`${item.key}-${index}`}
              className="pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-background"
              style={{
                left: `${xPercent(index)}%`,
                // The SVG is exactly CHART_HEIGHT px tall and starts at
                // this container's top edge, so viewBox y maps 1:1 to px.
                top: yAt(value),
                backgroundColor: item.color,
              }}
            />
          ))}
          <div
            className="relative mt-1.5 h-4 text-[11px] text-muted-foreground"
            aria-hidden="true"
          >
            {points.map((point, index) =>
              labelIndices.has(index) ? (
                <span
                  key={point.key}
                  className="absolute top-0 whitespace-nowrap"
                  style={{
                    left: `${xPercent(index)}%`,
                    transform:
                      index === 0
                        ? "none"
                        : index === points.length - 1
                          ? "translateX(-100%)"
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
