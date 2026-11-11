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
import { ManualAdjustmentForm } from "@/features/loans/components/manual-adjustment-form";
import { RepaymentForm } from "@/features/loans/components/repayment-form";
import { useCustomer } from "../hooks/use-customers";
import { CustomerHeader } from "./customer-header";

// Manager's full profile: header + loan ledger + manual adjustment +
// stand-alone repayment, per docs/epics/05-customers-loans.md.
export function CustomerProfile({ customerId }: { customerId: string }) {
  const { data: customer, isLoading } = useCustomer(customerId);
  const [isRepaymentOpen, setIsRepaymentOpen] = useState(false);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <CustomerHeader customerId={customerId} />
      {isLoading || !customer ? (
        <>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-8 w-40" />
          </div>
          <TableSkeleton columns={5} />
        </>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
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
            <Dialog open={isAdjustmentOpen} onOpenChange={setIsAdjustmentOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary">Record adjustment</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Manual adjustment</DialogTitle>
                </DialogHeader>
                <ManualAdjustmentForm
                  accountId={customer.loanAccountId}
                  customerId={customerId}
                  onSuccess={() => setIsAdjustmentOpen(false)}
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
