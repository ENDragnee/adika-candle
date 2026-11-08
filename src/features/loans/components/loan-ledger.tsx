"use client";

import { useState } from "react";
import {
  DataTable,
  type DataTableColumn,
  TableSkeleton,
} from "@/components/ui/data-table";
import { useLoanTransactions } from "../hooks/use-loans";
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

export function LoanLedger({ accountId }: { accountId: string }) {
  const [page, setPage] = useState(1);
  const { data: result, isLoading } = useLoanTransactions(accountId, {
    page,
  });

  if (isLoading) {
    return <TableSkeleton columns={columns.length} />;
  }

  return (
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
  );
}
