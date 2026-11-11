"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  const [isRepaymentOpen, setIsRepaymentOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <CustomerHeader customerId={customerId} />
      {isLoading || !customer ? (
        <>
          <Skeleton className="h-8 w-40" />
          <TableSkeleton columns={5} />
        </>
      ) : (
        <>
          <div>
            <Dialog open={isRepaymentOpen} onOpenChange={setIsRepaymentOpen}>
              <DialogTrigger asChild>
                <Button>Record repayment</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record repayment or advance</DialogTitle>
                </DialogHeader>
                <RepaymentForm
                  accountId={customer.loanAccountId}
                  customerId={customerId}
                  onSuccess={() => setIsRepaymentOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
          <LoanLedger accountId={customer.loanAccountId} />
        </>
      )}
    </div>
  );
}
