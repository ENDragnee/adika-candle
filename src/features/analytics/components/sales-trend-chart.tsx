"use client";

import { useState } from "react";
import type { SalesTrendPointDTO } from "../validators/analytics.schema";

const CHART_HEIGHT_PX = 140;

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
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 -translate-y-full border border-border bg-background px-2 py-1 text-xs shadow-sm"
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
                  className={`w-full max-w-6 min-h-0.5 rounded-t-[4px] outline-none transition-colors ${
                    isHovered ? "bg-foreground" : "bg-chart-3"
                  }`}
                  style={{ height: `${heightPercent}%`, minHeight: 2 }}
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
