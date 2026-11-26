import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { InventoryDashboard } from "@/features/stock/components/inventory-dashboard";
import { CheckPermission } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

// Remaining stock and today's movement, in cartons — no money overview
// for the Inventory Manager (prices appear only when recording a sale).
export default async function InventoryDashboardPage() {
  const allowed = await CheckPermission("stock:read");

  if (!allowed) {
    redirect("/unauthorized");
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader description="What's left in stock and what moved today, in cartons." />
      <InventoryDashboard />
    </div>
  );
}
