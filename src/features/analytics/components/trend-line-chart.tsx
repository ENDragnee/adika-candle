"use client";

import { useState } from "react";
import { useChartEntrance } from "@/components/motion/use-chart-entrance";

export interface TrendSeries {
  key: string;
  label: string;
  color: string;
}

export interface TrendPoint {
  label: string;
  values: Record<string, number>;
}

const CHART_HEIGHT = 160;
const CHART_WIDTH = 600;
const GRIDLINE_FRACTIONS = [0, 0.25, 0.5, 0.75, 1];
const PATH_DRAW_DURATION_MS = 500;

// Hand-built SVG line chart (no charting dependency — see docs/DECISIONS.md,
// "Epic 17 decisions" for why hand-built won over a library). Up to two
// series; a legend renders only for 2 (single series needs no legend box
// per the dataviz skill). Entrance uses Epic 16's useChartEntrance gating a
// stroke-dashoffset draw-in — the standard SVG technique, driven by the
// same shared hook every other chart in this app uses.
export function TrendLineChart({
  points,
  series,
  valueFormatter = (value: number) => value.toFixed(1),
}: {
  points: TrendPoint[];
  series: TrendSeries[];
  valueFormatter?: (value: number) => string;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const hasEntered = useChartEntrance(points.length > 0);

  if (points.length === 0) {
    return <p className="text-sm text-muted-foreground">No data yet.</p>;
  }

  const maxValue = Math.max(
    1,
    ...points.flatMap((point) =>
      series.map((item) => point.values[item.key] ?? 0),
    ),
  );
  const xStep = points.length > 1 ? CHART_WIDTH / (points.length - 1) : 0;
  const ToY = (value: number) =>
    CHART_HEIGHT - (value / maxValue) * CHART_HEIGHT;

  const paths = series.map((item) => ({
    series: item,
    d: points
      .map((point, index) => {
        const x = index * xStep;
        const y = ToY(point.values[item.key] ?? 0);
        return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" "),
  }));

  const hovered = hoveredIndex !== null ? points[hoveredIndex] : null;
  const hoverX = hoveredIndex !== null ? hoveredIndex * xStep : 0;

  return (
    <div className="flex flex-col gap-2">
      {series.length >= 2 && (
        <div className="flex gap-4 text-xs">
          {series.map((item) => (
            <div key={item.key} className="flex items-center gap-1.5">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      )}
      <div className="relative">
        {hovered && (
          <div
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-popover px-2 py-1 text-xs text-popover-foreground ring-1 ring-foreground/10 shadow-md"
            style={{ left: `${(hoverX / CHART_WIDTH) * 100}%` }}
          >
            <div className="font-medium text-foreground">{hovered.label}</div>
            {series.map((item) => (
              <div
                key={item.key}
                className="flex items-center gap-1.5 text-muted-foreground"
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                {item.label}:{" "}
                <span className="tabular-nums text-foreground">
                  {valueFormatter(hovered.values[item.key] ?? 0)}
                </span>
              </div>
            ))}
          </div>
        )}
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="w-full"
          style={{ height: CHART_HEIGHT }}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {GRIDLINE_FRACTIONS.map((fraction) => (
            <line
              key={fraction}
              x1={0}
              x2={CHART_WIDTH}
              y1={CHART_HEIGHT * fraction}
              y2={CHART_HEIGHT * fraction}
              className="stroke-border"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {paths.map(({ series: item, d }) => (
            <path
              key={item.key}
              d={d}
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
              key={point.label}
              x={index * xStep - (xStep || CHART_WIDTH) / 2}
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
              x1={hoverX}
              x2={hoverX}
              y1={0}
              y2={CHART_HEIGHT}
              className="stroke-muted-foreground"
              strokeWidth={1}
              strokeDasharray="2,2"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{points[0]?.label}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </div>
  );
}
