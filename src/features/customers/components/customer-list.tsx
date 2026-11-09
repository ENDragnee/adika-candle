"use client";

import Link from "next/link";
import { useState } from "react";
import {
  DataTable,
  type DataTableColumn,
  TableSkeleton,
} from "@/components/ui/data-table";
import { ExportMenu } from "@/components/ui/export-menu";
import { Input } from "@/components/ui/input";
import type { ExportColumn } from "@/lib/export/export-column";
import { MAX_PAGE_SIZE } from "@/lib/pagination";
import { useDebounce } from "@/lib/use-debounce";
import { useCustomers } from "../hooks/use-customers";
import { FetchCustomers } from "../services/customer.service";
import type { CustomerDTO } from "../validators/customer.schema";

export function CustomerList({
  detailHrefBase,
}: {
  // Links customer names to `${detailHrefBase}/${customerId}`. Both the
  // Manager and Inventory Manager detail pages use this list, just with
  // different base paths.
  detailHrefBase: string;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  // Searched server-side (see docs/DECISIONS.md) — debounced so typing
  // doesn't fire a request per keystroke.
  const debouncedSearch = useDebounce(search.trim(), 400);

  function handleSearchChange(value: string) {
    setSearch(value);
    // A new search term always starts back at page 1 — the old page
    // number may not exist in the new, smaller result set.
    setPage(1);
  }

  const { data: result, isLoading } = useCustomers({
    page,
    search: debouncedSearch || undefined,
  });

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

  const exportColumns: ExportColumn<CustomerDTO>[] = [
    { header: "Name", value: (customer) => customer.name },
    { header: "Phone", value: (customer) => customer.phone ?? "—" },
    { header: "Location", value: (customer) => customer.location ?? "—" },
    { header: "Loan balance", value: (customer) => customer.loanBalance },
    {
      header: "Status",
      value: (customer) => (customer.isActive ? "Active" : "Inactive"),
    },
  ];

  if (isLoading) {
    return <TableSkeleton columns={columns.length} />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Input
          value={search}
          onChange={(event) => handleSearchChange(event.target.value)}
          placeholder="Search by name…"
          className="max-w-sm"
        />
        <ExportMenu
          filename="customers"
          title="Customers"
          columns={exportColumns}
          rows={() =>
            FetchCustomers({
              pageSize: MAX_PAGE_SIZE,
              ...(debouncedSearch && { search: debouncedSearch }),
            }).then((result) => result.data)
          }
        />
      </div>
      <DataTable
        columns={columns}
        data={result?.data ?? []}
        getRowKey={(customer) => customer.id}
        emptyMessage="No customers found."
        pagination={{
          page,
          totalPages: result?.pagination.totalPages ?? 1,
          onPageChange: setPage,
        }}
      />
    </div>
  );
}
