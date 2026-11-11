import { redirect } from "next/navigation";
import { CustomerLedgerView } from "@/features/customers/components/customer-ledger-view";
import { CheckPermission } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

export default async function InventoryCustomerDetailPage(
  props: PageProps<"/inventory/customers/[id]">,
) {
  const allowedCustomer = await CheckPermission("customer:read");
  const allowedLoan = await CheckPermission("loan:record");

  if (!allowedCustomer || !allowedLoan) {
    redirect("/unauthorized");
  }

  const { id } = await props.params;

  return <CustomerLedgerView customerId={id} />;
}
