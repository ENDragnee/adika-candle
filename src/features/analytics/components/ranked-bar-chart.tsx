"use client";

import { useChartEntrance } from "@/components/motion/use-chart-entrance";

export interface RankedBarDatum {
  key: string;
  label: string;
  value: number;
  color: string;
}

const BAR_ENTRANCE_DURATION_MS = 320;
const BAR_STAGGER_STEP_MS = 30;
const BAR_STAGGER_CAP_MS = 240;

// Hand-built horizontal bar chart — used for Stock Health's status
// distribution and Best Sellers' two rankings. Final width is set directly
// (not animated); entrance is a composite-only scaleX from the left edge,
// gated by Epic 16's useChartEntrance — same pattern as SalesTrendChart's
// vertical bars, rotated.
export function RankedBarChart({
  data,
  valueFormatter = (value: number) => value.toString(),
}: {
  data: RankedBarDatum[];
  valueFormatter?: (value: number) => string;
}) {
  const hasEntered = useChartEntrance(data.length > 0);

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No data yet.</p>;
  }

  const maxValue = Math.max(1, ...data.map((datum) => datum.value));

  return (
    <div className="flex flex-col gap-2">
      {data.map((datum, index) => {
        const widthPercent = Math.max((datum.value / maxValue) * 100, 0);

        return (
          <div key={datum.key} className="flex items-center gap-2">
            <span
              className="w-28 shrink-0 truncate text-xs text-muted-foreground"
              title={datum.label}
            >
              {datum.label}
            </span>
            <div className="h-5 flex-1 overflow-hidden rounded-sm bg-muted">
              <div
                className="h-full rounded-sm"
                style={{
                  width: `${widthPercent}%`,
                  backgroundColor: datum.color,
                  transform: hasEntered ? "scaleX(1)" : "scaleX(0)",
                  transformOrigin: "left",
                  transitionProperty: "transform",
                  transitionDuration: `${BAR_ENTRANCE_DURATION_MS}ms`,
                  transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
                  transitionDelay: `${Math.min(index * BAR_STAGGER_STEP_MS, BAR_STAGGER_CAP_MS)}ms`,
                }}
              />
            </div>
            <span className="w-16 shrink-0 text-right text-xs text-foreground tabular-nums">
              {valueFormatter(datum.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
