"use client";

import Link from "next/link";
import { useManagerDashboard } from "../hooks/use-analytics";
import { SalesTrendChart } from "./sales-trend-chart";

function FormatDateTime(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Never";
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border border-border p-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

export function ManagerDashboard() {
  const { data, isLoading } = useManagerDashboard();

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Loading dashboard…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile
          label="Sales, last 30 days"
          value={data.salesTotalLast30Days}
        />
        <StatTile
          label="Outstanding loan exposure"
          value={data.totalLoanExposure}
        />
        <StatTile
          label="Low-stock alerts"
          value={String(data.lowStockAlerts.length)}
        />
      </div>

      <Section
        title="Sales trend"
        description="Daily sales totals, last 30 days."
      >
        <SalesTrendChart points={data.salesTrend} />
      </Section>

      <Section
        title="Low-stock alerts"
        description="Products below their configured low-stock threshold. Set a threshold from a product's detail page to opt it in."
      >
        {data.lowStockAlerts.length ? (
          <div className="overflow-x-auto border border-border">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="p-2 text-sm font-medium">Product</th>
                  <th className="p-2 text-sm font-medium">On hand (kg)</th>
                  <th className="p-2 text-sm font-medium">Threshold (kg)</th>
                </tr>
              </thead>
              <tbody>
                {data.lowStockAlerts.map((alert) => (
                  <tr key={alert.productId} className="border-b border-border">
                    <td className="p-2 text-sm">
                      <Link
                        href={`/manager/stock/${alert.productId}`}
                        className="underline underline-offset-4"
                      >
                        {alert.productName}
                      </Link>{" "}
                      <span className="text-muted-foreground">
                        ({alert.productSku})
                      </span>
                    </td>
                    <td className="p-2 text-sm">{alert.quantityKg}</td>
                    <td className="p-2 text-sm text-muted-foreground">
                      {alert.thresholdKg}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No products are below their low-stock threshold.
          </p>
        )}
      </Section>

      <Section title="Stock levels" description="Current balance per product.">
        <div className="overflow-x-auto border border-border">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="p-2 text-sm font-medium">Product</th>
                <th className="p-2 text-sm font-medium">Quantity (kg)</th>
                <th className="p-2 text-sm font-medium">Last updated</th>
              </tr>
            </thead>
            <tbody>
              {data.stockLevels.length ? (
                data.stockLevels.map((level) => (
                  <tr key={level.productId} className="border-b border-border">
                    <td className="p-2 text-sm">
                      <Link
                        href={`/manager/stock/${level.productId}`}
                        className="underline underline-offset-4"
                      >
                        {level.productName}
                      </Link>{" "}
                      <span className="text-muted-foreground">
                        ({level.productSku})
                      </span>
                    </td>
                    <td className="p-2 text-sm">{level.quantityKg}</td>
                    <td className="p-2 text-sm text-muted-foreground">
                      {FormatDateTime(level.updatedAt)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={3}
                    className="p-3 text-center text-sm text-muted-foreground"
                  >
                    No products yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        title="Loan exposure"
        description="Customer loan account balances, highest first."
      >
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
              {data.loanAccounts.length ? (
                data.loanAccounts.map((account) => (
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
      </Section>
    </div>
  );
}
