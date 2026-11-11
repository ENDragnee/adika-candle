import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { SaleList } from "@/features/sales/components/sale-list";
import { CheckPermission } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

export default async function ManagerSalesPage() {
  const allowed = await CheckPermission("sale:read");

  if (!allowed) {
    redirect("/unauthorized");
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader description="Read-only sales history across every customer and product." />
      <SaleList />
    </div>
  );
}
