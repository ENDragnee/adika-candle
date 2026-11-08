import { redirect } from "next/navigation";
import { InventoryMaterialsView } from "@/features/raw-materials/components/inventory-materials-view";
import { CheckPermission } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

export default async function InventoryMaterialsPage() {
  const allowed = await CheckPermission("raw-material:read");

  if (!allowed) {
    redirect("/unauthorized");
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Raw materials</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Current balances across all raw materials. Record incoming or consumed
          activity below.
        </p>
      </div>
      <InventoryMaterialsView />
    </div>
  );
}
