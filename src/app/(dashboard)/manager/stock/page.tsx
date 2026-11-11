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
      <PageHeader description="What is on hand for every product, and whether it is running low. Open a product for its history or to record a stock count." />
      <StockBalanceList detailHrefBase="/manager/stock" />
    </div>
  );
}
