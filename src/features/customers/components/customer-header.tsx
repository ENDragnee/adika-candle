"use client";

import { MapPinIcon, PhoneIcon } from "@phosphor-icons/react";
import { usePageHeader } from "@/components/shell/use-page-header";
import { Card, CardContent } from "@/components/ui/card";
import { CardSkeleton } from "@/components/ui/skeleton";
import { ToneBadge } from "@/components/ui/tone-badge";
import { DescribeLoanBalance } from "@/lib/format";
import { useCustomer } from "../hooks/use-customers";

// Customer summary (Epic 21): the balance in words as the headline, with
// contact details beside it. Sets the TopBar title and a back link.
export function CustomerHeader({
  customerId,
  parentHref,
}: {
  customerId: string;
  parentHref: string;
}) {
  const { data: customer, isLoading } = useCustomer(customerId);
  usePageHeader({
    title: customer?.name ?? null,
    description: customer ? "Customer account and purchases" : null,
    parent: { label: "Customers", href: parentHref },
  });

  if (isLoading || !customer) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  const balance = DescribeLoanBalance(customer.loanBalance);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Card>
        <CardContent className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">{balance.label}</span>
          <span className="text-2xl font-semibold tracking-tight tabular-nums">
            {balance.direction === "SETTLED" ? "Nothing owed" : balance.amount}
          </span>
          <span className="text-xs text-muted-foreground">
            {balance.direction === "OWES" &&
              "Goes down when they pay; goes up with each sale on account."}
            {balance.direction === "CREDIT" &&
              "They paid in advance. It's spent automatically on their next sales on account."}
            {balance.direction === "SETTLED" && "Account is settled."}
          </span>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-col gap-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">{customer.name}</span>
            <ToneBadge tone={customer.isActive ? "good" : "neutral"}>
              {customer.isActive ? "Active" : "Inactive"}
            </ToneBadge>
          </div>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <PhoneIcon className="size-4" />
            {customer.phone ?? "No phone"}
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <MapPinIcon className="size-4" />
            {customer.location ?? "No location"}
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
