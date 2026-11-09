import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { InventorySalesView } from "@/features/sales/components/inventory-sales-view";
import { CheckPermission, GetApiSession } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

export default async function InventorySalesPage() {
  const allowed = await CheckPermission("sale:read");

  if (!allowed) {
    redirect("/unauthorized");
  }

  const session = await GetApiSession();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader description="Sales you've recorded." />
      <InventorySalesView createdById={session?.user?.id} />
    </div>
  );
}
