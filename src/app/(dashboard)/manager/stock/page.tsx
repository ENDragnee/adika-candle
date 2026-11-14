import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { AcceptStockDialog } from "@/features/stock/components/accept-stock-dialog";
import { StockBalanceList } from "@/features/stock/components/stock-balance-list";
import { GetSession } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

export default async function ManagerStockPage() {
  const session = await GetSession();
  const permissions = session.user.permissions;
  if (!permissions.includes("stock:read")) {
    redirect("/unauthorized");
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader description="What is on hand for every product, and whether it is running low. Open a product for its history or to record a stock count." />
      {permissions.includes("stock:accept") && (
        <div className="flex justify-end">
          <AcceptStockDialog />
        </div>
      )}
      <StockBalanceList detailHrefBase="/manager/stock" />
    </div>
  );
}
