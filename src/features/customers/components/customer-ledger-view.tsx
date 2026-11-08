"use client";

import { TableSkeleton } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { LoanLedger } from "@/features/loans/components/loan-ledger";
import { RepaymentForm } from "@/features/loans/components/repayment-form";
import { useCustomer } from "../hooks/use-customers";
import { CustomerHeader } from "./customer-header";

// Inventory Manager's view: header + ledger + "Record Repayment" action —
// no manual adjustment (Manager-only correction), per
// docs/epics/05-customers-loans.md.
export function CustomerLedgerView({ customerId }: { customerId: string }) {
  const { data: customer, isLoading } = useCustomer(customerId);

  return (
    <div className="flex flex-col gap-4">
      <CustomerHeader customerId={customerId} />
      {isLoading || !customer ? (
        <>
          <Skeleton className="h-56 w-full max-w-sm" />
          <TableSkeleton columns={5} />
        </>
      ) : (
        <>
          <RepaymentForm
            accountId={customer.loanAccountId}
            customerId={customerId}
          />
          <LoanLedger accountId={customer.loanAccountId} />
        </>
      )}
    </div>
  );
}
