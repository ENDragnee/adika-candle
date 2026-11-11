import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { LoanOversightList } from "@/features/loans/components/loan-oversight-list";
import { CheckPermission } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

export default async function LoansPage() {
  const allowed = await CheckPermission("loan:manage");

  if (!allowed) {
    redirect("/unauthorized");
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader description="Cross-customer oversight — outstanding balances across every loan account, highest first." />
      <LoanOversightList />
    </div>
  );
}
