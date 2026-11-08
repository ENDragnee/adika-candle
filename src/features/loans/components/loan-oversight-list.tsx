"use client";

import Link from "next/link";
import { useLoanAccounts } from "../hooks/use-loans";

function FormatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

export function LoanOversightList() {
  const { data: accounts, isLoading } = useLoanAccounts();

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">Loading loan accounts…</p>
    );
  }

  return (
    <div className="overflow-x-auto border border-border">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="p-2 text-sm font-medium">Customer</th>
            <th className="p-2 text-sm font-medium">Balance</th>
            <th className="p-2 text-sm font-medium">Last activity</th>
          </tr>
        </thead>
        <tbody>
          {accounts?.length ? (
            accounts.map((account) => (
              <tr key={account.id} className="border-b border-border">
                <td className="p-2 text-sm">
                  <Link
                    href={`/manager/customers/${account.customerId}`}
                    className="underline underline-offset-4"
                  >
                    {account.customerName}
                  </Link>
                </td>
                <td className="p-2 text-sm">{account.balance}</td>
                <td className="p-2 text-sm text-muted-foreground">
                  {FormatDateTime(account.updatedAt)}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={3}
                className="p-3 text-center text-sm text-muted-foreground"
              >
                No loan accounts yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
