"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  PackageIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { CardSkeleton } from "@/components/ui/skeleton";
import { StatTile } from "@/features/analytics/components/stat-tile";
import { useSaleUnitMode } from "@/lib/feature-flags/use-flags";
import { FormatPacking, FormatSaleUnits } from "@/lib/packing";
import { useStockSummary } from "../hooks/use-stock";
import { StockBalanceList } from "./stock-balance-list";

const FormatCartons = (value: number) => FormatPacking(value);

// The Inventory Manager's home: what's left and what moved today, in
// cartons. Deliberately no money — prices show only where a sale is
// recorded.
export function InventoryDashboard() {
  const { data: summary } = useStockSummary();
  const mode = useSaleUnitMode();
  // Sales may be in packets (sale-unit-mode flag); production is always
  // cartons.
  const FormatSold = (value: number) =>
    mode === "CARTON" ? FormatPacking(value) : FormatSaleUnits(value, mode);

  return (
    <div className="flex flex-col gap-6">
      {summary ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label="Remaining"
            icon={PackageIcon}
            value={Number(summary.remainingCartons)}
            format={FormatCartons}
            hint={`${FormatSaleUnits(summary.remainingCartons, mode)} across ${summary.productCount} products`}
          />
          <StatTile
            label="Low or out of stock"
            icon={WarningIcon}
            value={summary.lowOrOutCount}
            hint={
              summary.lowOrOutCount === 0
                ? "Everything is stocked"
                : "Products below their alert level"
            }
          />
          <StatTile
            label="Produced today"
            icon={ArrowDownIcon}
            value={Number(summary.producedTodayCartons)}
            format={FormatCartons}
            hint="Stock accepted from production"
          />
          <StatTile
            label="Sold today"
            icon={ArrowUpIcon}
            value={Number(summary.soldTodayCartons)}
            format={FormatSold}
            hint="All sales, voids netted out"
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Remaining stock</h2>
        <StockBalanceList />
      </div>
    </div>
  );
}
