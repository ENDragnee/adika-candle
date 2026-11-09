import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
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
      <PageHeader description="Current balances across all products." />
      <InventoryStockView />
    </div>
  );
}
