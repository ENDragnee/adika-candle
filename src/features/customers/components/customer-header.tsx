"use client";

import { DetailSkeleton } from "@/components/ui/skeleton";
import { useCustomer } from "../hooks/use-customers";

export function CustomerHeader({ customerId }: { customerId: string }) {
  const { data: customer, isLoading } = useCustomer(customerId);

  if (isLoading || !customer) {
    return <DetailSkeleton rows={5} />;
  }

  return (
    <dl className="flex max-w-sm flex-col gap-2">
      <div className="flex justify-between border-b border-border pb-2">
        <dt className="text-sm text-muted-foreground">Name</dt>
        <dd className="text-sm font-medium">{customer.name}</dd>
      </div>
      <div className="flex justify-between border-b border-border pb-2">
        <dt className="text-sm text-muted-foreground">Phone</dt>
        <dd className="text-sm font-medium">{customer.phone ?? "—"}</dd>
      </div>
      <div className="flex justify-between border-b border-border pb-2">
        <dt className="text-sm text-muted-foreground">Location</dt>
        <dd className="text-sm font-medium">{customer.location ?? "—"}</dd>
      </div>
      <div className="flex justify-between border-b border-border pb-2">
        <dt className="text-sm text-muted-foreground">Loan balance</dt>
        <dd className="text-sm font-medium">{customer.loanBalance}</dd>
      </div>
      <div className="flex justify-between pb-2">
        <dt className="text-sm text-muted-foreground">Status</dt>
        <dd className="text-sm font-medium">
          {customer.isActive ? "Active" : "Inactive"}
        </dd>
      </div>
    </dl>
  );
}
