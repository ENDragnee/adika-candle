import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { CustomerList } from "@/features/customers/components/customer-list";
import { CheckPermission } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

export default async function InventoryCustomersPage() {
  const allowed = await CheckPermission("customer:read");

  if (!allowed) {
    redirect("/unauthorized");
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader description="Directory and loan balance lookup." />
      <CustomerList detailHrefBase="/inventory/customers" />
    </div>
  );
}
