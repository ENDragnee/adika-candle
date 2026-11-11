"use client";

import { CustomerProfile } from "./customer-profile";

// Inventory Manager's customer page — the shared CustomerProfile without
// the Manager-only balance correction (docs/epics/05-customers-loans.md).
export function CustomerLedgerView({ customerId }: { customerId: string }) {
  return (
    <CustomerProfile
      customerId={customerId}
      canAdjust={false}
      linkBase="/inventory"
    />
  );
}
