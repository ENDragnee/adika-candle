"use client";

import { RecordSaleDialog } from "./record-sale-dialog";
import { SaleList } from "./sale-list";

export function InventorySalesView({ createdById }: { createdById?: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <RecordSaleDialog />
      </div>
      <SaleList createdById={createdById} linkBase="/inventory" />
    </div>
  );
}
