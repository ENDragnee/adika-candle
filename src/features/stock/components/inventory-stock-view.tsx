"use client";

import { AcceptStockDialog } from "./accept-stock-dialog";
import { StockBalanceList } from "./stock-balance-list";

export function InventoryStockView() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <AcceptStockDialog />
      </div>
      <StockBalanceList />
    </div>
  );
}
