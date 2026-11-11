import { redirect } from "next/navigation";
import { CustomerProfile } from "@/features/customers/components/customer-profile";
import { CheckPermission } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

export default async function ManagerCustomerDetailPage(
  props: PageProps<"/manager/customers/[id]">,
) {
  const allowedCustomer = await CheckPermission("customer:manage");
  const allowedLoan = await CheckPermission("loan:manage");

  if (!allowedCustomer || !allowedLoan) {
    redirect("/unauthorized");
  }

  const { id } = await props.params;

  return <CustomerProfile customerId={id} />;
}
