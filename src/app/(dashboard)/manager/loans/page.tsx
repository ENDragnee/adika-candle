import { redirect } from "next/navigation";
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
      <div>
        <h1 className="text-lg font-semibold">Loans</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cross-customer oversight — outstanding balances across every loan
          account, highest first.
        </p>
      </div>
      <LoanOversightList />
    </div>
  );
}
