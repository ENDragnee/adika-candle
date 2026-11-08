"use client";

import { LoanLedger } from "@/features/loans/components/loan-ledger";
import { ManualAdjustmentForm } from "@/features/loans/components/manual-adjustment-form";
import { RepaymentForm } from "@/features/loans/components/repayment-form";
import { useCustomer } from "../hooks/use-customers";
import { CustomerHeader } from "./customer-header";

// Manager's full profile: header + loan ledger + manual adjustment +
// stand-alone repayment, per docs/epics/05-customers-loans.md.
export function CustomerProfile({ customerId }: { customerId: string }) {
  const { data: customer, isLoading } = useCustomer(customerId);

  return (
    <div className="flex flex-col gap-4">
      <CustomerHeader customerId={customerId} />
      {isLoading || !customer ? (
        <p className="text-sm text-muted-foreground">Loading loan account…</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-4">
            <RepaymentForm
              accountId={customer.loanAccountId}
              customerId={customerId}
            />
            <ManualAdjustmentForm
              accountId={customer.loanAccountId}
              customerId={customerId}
            />
          </div>
          <LoanLedger accountId={customer.loanAccountId} />
        </>
      )}
    </div>
  );
}
