"use client";

import { useLoanTransactions } from "../hooks/use-loans";

function FormatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

export function LoanLedger({ accountId }: { accountId: string }) {
  const { data: transactions, isLoading } = useLoanTransactions(accountId);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading ledger…</p>;
  }

  return (
    <div className="overflow-x-auto border border-border">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="p-2 text-sm font-medium">Type</th>
            <th className="p-2 text-sm font-medium">Amount</th>
            <th className="p-2 text-sm font-medium">Balance after</th>
            <th className="p-2 text-sm font-medium">Note</th>
            <th className="p-2 text-sm font-medium">Date</th>
          </tr>
        </thead>
        <tbody>
          {transactions?.length ? (
            transactions.map((transaction) => (
              <tr key={transaction.id} className="border-b border-border">
                <td className="p-2 text-sm">{transaction.type}</td>
                <td className="p-2 text-sm">{transaction.amount}</td>
                <td className="p-2 text-sm">{transaction.balanceAfter}</td>
                <td className="p-2 text-sm text-muted-foreground">
                  {transaction.note ?? "—"}
                </td>
                <td className="p-2 text-sm text-muted-foreground">
                  {FormatDateTime(transaction.createdAt)}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={5}
                className="p-3 text-center text-sm text-muted-foreground"
              >
                No loan activity yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
