"use client";

import {
  FormatDateTime,
  FormatKg,
  FormatNumber,
  FormatShortDate,
} from "@/lib/format";
import { TrendLineChart } from "./trend-line-chart";

export interface BalanceEvent {
  id: string;
  createdAt: string;
  balanceAfterKg: string;
}

// How a stock or raw-material balance moved over its most recent ledger
// entries (Epic 21) — one point per movement, oldest to newest, with the
// low-stock alert level as a dashed guide when one is set. Reuses the
// ledger's own balanceAfter snapshots, so it needs no extra endpoint.
export function BalanceHistoryChart({
  entries,
  thresholdKg,
}: {
  // Newest first, as the ledger API returns them.
  entries: BalanceEvent[];
  thresholdKg?: string | null;
}) {
  const chronological = [...entries].reverse();

  if (chronological.length < 2) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        A chart appears once there are at least two stock movements.
      </p>
    );
  }

  return (
    <TrendLineChart
      points={chronological.map((entry) => ({
        key: entry.id,
        label: FormatShortDate(entry.createdAt),
        tooltipLabel: FormatDateTime(entry.createdAt),
        values: { balance: Number(entry.balanceAfterKg) },
      }))}
      series={[
        {
          key: "balance",
          label: "Balance",
          color: "var(--color-chart-series-2)",
        },
      ]}
      valueFormatter={FormatKg}
      axisFormatter={(value) => FormatNumber(value, 0)}
      referenceLine={
        thresholdKg
          ? {
              value: Number(thresholdKg),
              label: `Alert level ${FormatKg(thresholdKg)}`,
            }
          : null
      }
    />
  );
}
