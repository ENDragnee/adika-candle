import { redirect } from "next/navigation";
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
      <div>
        <h1 className="text-lg font-semibold">Customers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Directory and loan balance lookup.
        </p>
      </div>
      <CustomerList detailHrefBase="/inventory/customers" />
    </div>
  );
}
