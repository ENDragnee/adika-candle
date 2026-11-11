import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { StockBalanceList } from "@/features/stock/components/stock-balance-list";
import { CheckPermission } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

export default async function ManagerStockPage() {
  const allowed = await CheckPermission("stock:read");

  if (!allowed) {
    redirect("/unauthorized");
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader description="Current balances across all products. Select a product for its full ledger." />
      <StockBalanceList detailHrefBase="/manager/stock" />
    </div>
  );
}
