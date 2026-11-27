"use client";

import { MOTION } from "@/components/motion/motion-tokens";

export interface RankedBarDatum {
  key: string;
  label: string;
  value: number;
  color: string;
}

// Hand-built horizontal bar chart — used for Stock Health's status
// distribution and Best Sellers' two rankings. Bars render at their final
// width (no entrance); a refetch eases the width to its new value.
export function RankedBarChart({
  data,
  valueFormatter = (value: number) => value.toString(),
}: {
  data: RankedBarDatum[];
  valueFormatter?: (value: number) => string;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No data yet.</p>;
  }

  const maxValue = Math.max(1, ...data.map((datum) => datum.value));

  return (
    <div className="flex flex-col gap-2">
      {data.map((datum) => {
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
                  transition: `width ${MOTION.updateMs}ms ${MOTION.easeOut}`,
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
