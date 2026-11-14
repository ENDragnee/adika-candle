"use client";

import { MaterialBalanceList } from "./material-balance-list";
import { RecordActivityDialog } from "./record-activity-dialog";

export function InventoryMaterialsView() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <RecordActivityDialog />
      </div>
      <MaterialBalanceList />
    </div>
  );
}
