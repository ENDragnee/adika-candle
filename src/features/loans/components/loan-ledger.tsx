"use client";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
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
  const { data: transactions, isLoading } = useLoanTransactions(accountId);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading ledger…</p>;
  }

  return (
    <DataTable
      columns={columns}
      data={transactions ?? []}
      getRowKey={(transaction) => transaction.id}
      emptyMessage="No loan activity yet."
    />
  );
}
