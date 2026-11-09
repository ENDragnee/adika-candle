"use client";

import Link from "next/link";
import { useState } from "react";
import {
  DataTable,
  type DataTableColumn,
  TableSkeleton,
} from "@/components/ui/data-table";
import { ExportMenu } from "@/components/ui/export-menu";
import type { ExportColumn } from "@/lib/export/export-column";
import { MAX_PAGE_SIZE } from "@/lib/pagination";
import { useLoanAccounts } from "../hooks/use-loans";
import { FetchLoanAccounts } from "../services/loan.service";
import type { LoanAccountDTO } from "../validators/loan.schema";

function FormatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

const columns: DataTableColumn<LoanAccountDTO>[] = [
  {
    key: "customer",
    header: "Customer",
    cell: (account) => (
      <Link
        href={`/manager/customers/${account.customerId}`}
        className="underline underline-offset-4"
      >
        {account.customerName}
      </Link>
    ),
  },
  { key: "balance", header: "Balance", cell: (account) => account.balance },
  {
    key: "updated",
    header: "Last activity",
    cell: (account) => FormatDateTime(account.updatedAt),
    className: "text-muted-foreground",
  },
];

const exportColumns: ExportColumn<LoanAccountDTO>[] = [
  { header: "Customer", value: (account) => account.customerName },
  { header: "Balance", value: (account) => account.balance },
  {
    header: "Last activity",
    value: (account) => FormatDateTime(account.updatedAt),
  },
];

export function LoanOversightList() {
  const [page, setPage] = useState(1);
  const { data: result, isLoading } = useLoanAccounts({ page });

  if (isLoading) {
    return <TableSkeleton columns={columns.length} />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <ExportMenu
          filename="loan-accounts"
          title="Loan oversight"
          columns={exportColumns}
          rows={() =>
            FetchLoanAccounts({ pageSize: MAX_PAGE_SIZE }).then(
              (result) => result.data,
            )
          }
        />
      </div>
      <DataTable
        columns={columns}
        data={result?.data ?? []}
        getRowKey={(account) => account.id}
        emptyMessage="No loan accounts yet."
        pagination={{
          page,
          totalPages: result?.pagination.totalPages ?? 1,
          onPageChange: setPage,
        }}
      />
    </div>
  );
}
