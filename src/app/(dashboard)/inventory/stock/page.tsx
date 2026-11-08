import { redirect } from "next/navigation";
import { InventoryStockView } from "@/features/stock/components/inventory-stock-view";
import { CheckPermission } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

export default async function InventoryStockPage() {
  const allowed = await CheckPermission("stock:read");

  if (!allowed) {
    redirect("/unauthorized");
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Stock</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Current balances across all products.
        </p>
      </div>
      <InventoryStockView />
    </div>
  );
}
