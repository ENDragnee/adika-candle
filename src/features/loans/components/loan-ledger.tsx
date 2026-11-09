"use client";

import { useState } from "react";
import {
  DataTable,
  type DataTableColumn,
  TableSkeleton,
} from "@/components/ui/data-table";
import { ExportMenu } from "@/components/ui/export-menu";
import type { ExportColumn } from "@/lib/export/export-column";
import { MAX_PAGE_SIZE } from "@/lib/pagination";
import { useLoanTransactions } from "../hooks/use-loans";
import { FetchLoanTransactions } from "../services/loan.service";
import type { LoanTransactionDTO } from "../validators/loan.schema";

function FormatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

const columns: DataTableColumn<LoanTransactionDTO>[] = [
  { key: "type", header: "Type", cell: (transaction) => transaction.type },
  {
    key: "amount",
    header: "Amount",
    cell: (transaction) => transaction.amount,
  },
  {
    key: "balance",
    header: "Balance after",
    cell: (transaction) => transaction.balanceAfter,
  },
  {
    key: "note",
    header: "Note",
    cell: (transaction) => transaction.note ?? "—",
    className: "text-muted-foreground",
  },
  {
    key: "date",
    header: "Date",
    cell: (transaction) => FormatDateTime(transaction.createdAt),
    className: "text-muted-foreground",
  },
];

const exportColumns: ExportColumn<LoanTransactionDTO>[] = [
  { header: "Type", value: (transaction) => transaction.type },
  { header: "Amount", value: (transaction) => transaction.amount },
  { header: "Balance after", value: (transaction) => transaction.balanceAfter },
  { header: "Note", value: (transaction) => transaction.note ?? "—" },
  {
    header: "Date",
    value: (transaction) => FormatDateTime(transaction.createdAt),
  },
];

export function LoanLedger({ accountId }: { accountId: string }) {
  const [page, setPage] = useState(1);
  const { data: result, isLoading } = useLoanTransactions(accountId, {
    page,
  });

  if (isLoading) {
    return <TableSkeleton columns={columns.length} />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <ExportMenu
          filename="loan-ledger"
          title="Loan ledger"
          columns={exportColumns}
          rows={() =>
            FetchLoanTransactions(accountId, {
              pageSize: MAX_PAGE_SIZE,
            }).then((result) => result.data)
          }
        />
      </div>
      <DataTable
        columns={columns}
        data={result?.data ?? []}
        getRowKey={(transaction) => transaction.id}
        emptyMessage="No loan activity yet."
        pagination={{
          page,
          totalPages: result?.pagination.totalPages ?? 1,
          onPageChange: setPage,
        }}
      />
    </div>
  );
}
