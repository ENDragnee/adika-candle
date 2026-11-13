"use client";

import { ScalesIcon, WalletIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoanLedger } from "@/features/loans/components/loan-ledger";
import { ManualAdjustmentForm } from "@/features/loans/components/manual-adjustment-form";
import { RepaymentForm } from "@/features/loans/components/repayment-form";
import { SaleList } from "@/features/sales/components/sale-list";
import { useCustomer } from "../hooks/use-customers";
import { CustomerHeader } from "./customer-header";

// One customer page for both roles (Epic 21 merged the Manager's and the
// Inventory Manager's near-identical views): balance summary, payment
// action, the Manager-only balance correction (`canAdjust`), and tabs for
// the account history and the customer's purchases.
export function CustomerProfile({
  customerId,
  canAdjust,
  linkBase,
}: {
  customerId: string;
  canAdjust: boolean;
  // "/manager" or "/inventory".
  linkBase: string;
}) {
  const { data: customer, isLoading } = useCustomer(customerId);
  const [isRepaymentOpen, setIsRepaymentOpen] = useState(false);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <CustomerHeader
        customerId={customerId}
        parentHref={`${linkBase}/customers`}
      />
      {isLoading || !customer ? (
        <>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-9 w-40" />
          </div>
          <TableSkeleton columns={6} />
        </>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <Dialog open={isRepaymentOpen} onOpenChange={setIsRepaymentOpen}>
              <DialogTrigger asChild>
                <Button>
                  <WalletIcon data-icon="inline-start" />
                  Record payment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record payment</DialogTitle>
                  <DialogDescription>
                    Money {customer.name} paid toward what they owe, or paid in
                    advance.
                  </DialogDescription>
                </DialogHeader>
                <RepaymentForm
                  accountId={customer.loanAccountId}
                  customerId={customerId}
                  currentBalance={customer.loanBalance}
                  onSuccess={() => setIsRepaymentOpen(false)}
                />
              </DialogContent>
            </Dialog>
            {canAdjust && (
              <Dialog
                open={isAdjustmentOpen}
                onOpenChange={setIsAdjustmentOpen}
              >
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <ScalesIcon data-icon="inline-start" />
                    Correct balance
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Correct balance</DialogTitle>
                    <DialogDescription>
                      For fixing mistakes or carrying over an old balance. The
                      reason is kept in the account history.
                    </DialogDescription>
                  </DialogHeader>
                  <ManualAdjustmentForm
                    accountId={customer.loanAccountId}
                    customerId={customerId}
                    currentBalance={customer.loanBalance}
                    onSuccess={() => setIsAdjustmentOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>
          <Tabs defaultValue="account">
            <TabsList>
              <TabsTrigger value="account">Account history</TabsTrigger>
              <TabsTrigger value="purchases">Purchases</TabsTrigger>
            </TabsList>
            <TabsContent value="account" className="pt-2">
              <LoanLedger accountId={customer.loanAccountId} />
            </TabsContent>
            <TabsContent value="purchases" className="pt-2">
              <SaleList customerId={customerId} linkBase={linkBase} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
