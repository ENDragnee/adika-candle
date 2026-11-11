import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { SaleList } from "@/features/sales/components/sale-list";
import { StockBalanceList } from "@/features/stock/components/stock-balance-list";
import { CheckPermission, GetApiSession } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

// Simple enough to stay pure REST — reuses the same hooks/components as
// /inventory/sales and /manager/stock rather than a new GraphQL
// aggregation. See docs/DECISIONS.md, "Epic 8 decisions".
export default async function InventoryDashboardPage() {
  const allowed = await CheckPermission("stock:read");

  if (!allowed) {
    redirect("/unauthorized");
  }

  const session = await GetApiSession();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader description="Your recent sales and current stock levels." />

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">My recent sales</h2>
        <SaleList createdById={session?.user?.id} />
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Stock levels</h2>
        <StockBalanceList />
      </div>
    </div>
  );
}
