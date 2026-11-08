import { redirect } from "next/navigation";
import { MaterialBalanceList } from "@/features/raw-materials/components/material-balance-list";
import { CheckPermission } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

export default async function ManagerMaterialsPage() {
  const allowed = await CheckPermission("raw-material:read");

  if (!allowed) {
    redirect("/unauthorized");
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Raw materials</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Current balances across all raw materials. Select a material for its
          full ledger.
        </p>
      </div>
      <MaterialBalanceList detailHrefBase="/manager/materials" />
    </div>
  );
}
