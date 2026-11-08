"use client";

import Link from "next/link";
import { useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { useCustomers } from "../hooks/use-customers";
import type { CustomerDTO } from "../validators/customer.schema";

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

  const columns: DataTableColumn<CustomerDTO>[] = [
    {
      key: "name",
      header: "Name",
      cell: (customer) => (
        <Link
          href={`${detailHrefBase}/${customer.id}`}
          className="underline underline-offset-4"
        >
          {customer.name}
        </Link>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      cell: (customer) => customer.phone ?? "—",
      className: "text-muted-foreground",
    },
    {
      key: "location",
      header: "Location",
      cell: (customer) => customer.location ?? "—",
      className: "text-muted-foreground",
    },
    {
      key: "balance",
      header: "Loan balance",
      cell: (customer) => customer.loanBalance,
    },
    {
      key: "status",
      header: "Status",
      cell: (customer) => (customer.isActive ? "Active" : "Inactive"),
    },
  ];

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading customers…</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search by name…"
        className="max-w-sm"
      />
      <DataTable
        columns={columns}
        data={filtered ?? []}
        getRowKey={(customer) => customer.id}
        emptyMessage="No customers found."
      />
    </div>
  );
}
