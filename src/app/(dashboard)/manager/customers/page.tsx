import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { CustomerManager } from "@/features/customers/components/customer-manager";
import { CheckPermission } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

export default async function CustomersPage() {
  const allowed = await CheckPermission("customer:manage");

  if (!allowed) {
    redirect("/unauthorized");
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader description="Standard customers who can lend/borrow against future purchases." />
      <CustomerManager />
    </div>
  );
}
