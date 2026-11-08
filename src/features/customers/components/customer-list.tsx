"use client";

import Link from "next/link";
import { useState } from "react";
import { useCustomers } from "../hooks/use-customers";

export function CustomerList({
  detailHrefBase,
}: {
  // Links customer names to `${detailHrefBase}/${customerId}`. Both the
  // Manager and Inventory Manager detail pages use this list, just with
  // different base paths.
  detailHrefBase: string;
}) {
  const { data: customers, isLoading } = useCustomers();
  const [search, setSearch] = useState("");

  const filtered = customers?.filter((customer) =>
    customer.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading customers…</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search by name…"
        className="h-9 w-full max-w-sm rounded-none border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
      />
      <div className="overflow-x-auto border border-border">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="p-2 text-sm font-medium">Name</th>
              <th className="p-2 text-sm font-medium">Phone</th>
              <th className="p-2 text-sm font-medium">Location</th>
              <th className="p-2 text-sm font-medium">Loan balance</th>
              <th className="p-2 text-sm font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered?.length ? (
              filtered.map((customer) => (
                <tr key={customer.id} className="border-b border-border">
                  <td className="p-2 text-sm">
                    <Link
                      href={`${detailHrefBase}/${customer.id}`}
                      className="underline underline-offset-4"
                    >
                      {customer.name}
                    </Link>
                  </td>
                  <td className="p-2 text-sm text-muted-foreground">
                    {customer.phone ?? "—"}
                  </td>
                  <td className="p-2 text-sm text-muted-foreground">
                    {customer.location ?? "—"}
                  </td>
                  <td className="p-2 text-sm">{customer.loanBalance}</td>
                  <td className="p-2 text-sm">
                    {customer.isActive ? "Active" : "Inactive"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="p-3 text-center text-sm text-muted-foreground"
                >
                  No customers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
