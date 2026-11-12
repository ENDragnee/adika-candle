"use client";

import {
  DataTable,
  type DataTableColumn,
  TableSkeleton,
} from "@/components/ui/data-table";
import { ExportMenu } from "@/components/ui/export-menu";
import { ToneBadge } from "@/components/ui/tone-badge";
import type { ExportColumn } from "@/lib/export/export-column";
import {
  DescribeLoanBalance,
  FormatDateTime,
  FormatMoney,
  FormatSignedMoney,
} from "@/lib/format";
import { MAX_PAGE_SIZE } from "@/lib/pagination";
import { usePagination } from "@/lib/use-pagination";
import { useLoanTransactions } from "../hooks/use-loans";
import { LOAN_TRANSACTION_META } from "../labels";
import { FetchLoanTransactions } from "../services/loan.service";
import type { LoanTransactionDTO } from "../validators/loan.schema";

function BalanceAfter({ value }: { value: string }) {
  const described = DescribeLoanBalance(value);
  return (
    <span className="inline-flex flex-col items-end leading-tight">
      <span className="tabular-nums">
        {described.direction === "SETTLED" ? "Settled" : described.amount}
      </span>
      {described.direction !== "SETTLED" && (
        <span className="text-xs text-muted-foreground">
          {described.direction === "OWES" ? "owes you" : "credit"}
        </span>
      )}
    </span>
  );
}

const columns: DataTableColumn<LoanTransactionDTO>[] = [
  {
    key: "date",
    header: "Date",
    cell: (transaction) => FormatDateTime(transaction.createdAt),
  },
  {
    key: "type",
    header: "What happened",
    cell: (transaction) => {
      const meta = LOAN_TRANSACTION_META[transaction.type];
      return (
        <ToneBadge tone={meta.tone} title={meta.description}>
          {meta.label}
        </ToneBadge>
      );
    },
  },
  {
    key: "change",
    header: "Change",
    // + = customer owes more, − = owes less / more credit. Falls back to
    // the unsigned amount if the API didn't send a change.
    cell: (transaction) => (
      <span className="font-medium tabular-nums">
        {transaction.change === null
          ? FormatMoney(transaction.amount)
          : FormatSignedMoney(transaction.change)}
      </span>
    ),
    className: "text-right",
  },
  {
    key: "balance",
    header: "Balance after",
    cell: (transaction) => <BalanceAfter value={transaction.balanceAfter} />,
    className: "text-right",
  },
  {
    key: "note",
    header: "Note",
    cell: (transaction) => transaction.note ?? "—",
    className: "max-w-72 whitespace-normal text-muted-foreground",
  },
  {
    key: "by",
    header: "By",
    cell: (transaction) => transaction.createdByName ?? "—",
    className: "text-muted-foreground",
  },
];

const exportColumns: ExportColumn<LoanTransactionDTO>[] = [
  {
    header: "Date",
    value: (transaction) => FormatDateTime(transaction.createdAt),
  },
  {
    header: "What happened",
    value: (transaction) => LOAN_TRANSACTION_META[transaction.type].label,
  },
  {
    header: "Change (+ owes more, − owes less)",
    value: (transaction) => transaction.change ?? transaction.amount,
  },
  {
    header: "Balance after (+ owes you, − credit)",
    value: (transaction) => transaction.balanceAfter,
  },
  { header: "Note", value: (transaction) => transaction.note ?? "" },
  { header: "By", value: (transaction) => transaction.createdByName ?? "" },
];

export function LoanLedger({ accountId }: { accountId: string }) {
  const pager = usePagination();
  const { data: result, isLoading } = useLoanTransactions(accountId, {
    ...pager.params,
  });

  if (isLoading) {
    return <TableSkeleton columns={columns.length} />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <ExportMenu
          filename="customer-account"
          title="Customer account history"
          columns={exportColumns}
          rows={() =>
            FetchLoanTransactions(accountId, { pageSize: MAX_PAGE_SIZE }).then(
              (result) => result.data,
            )
          }
        />
      </div>
      <DataTable
        columns={columns}
        data={result?.data ?? []}
        getRowKey={(transaction) => transaction.id}
        emptyMessage="No account activity yet."
        pagination={pager.Bind(result?.pagination)}
      />
    </div>
  );
}
