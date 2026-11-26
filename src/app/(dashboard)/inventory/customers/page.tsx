import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { CustomerList } from "@/features/customers/components/customer-list";
import { CheckAnyPermission, CheckPermission } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

export default async function InventoryCustomersPage() {
  const allowed = await CheckPermission("customer:read");

  if (!allowed) {
    redirect("/unauthorized");
  }

  const canCreate = await CheckAnyPermission([
    "customer:create",
    "customer:manage",
  ]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader description="Your customers and what they owe." />
      <CustomerList
        detailHrefBase="/inventory/customers"
        canCreate={canCreate}
      />
    </div>
  );
}
