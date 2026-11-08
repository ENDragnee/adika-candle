"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useManagerDashboard } from "../hooks/use-analytics";
import type {
  DashboardLoanAccountDTO,
  DashboardStockLevelDTO,
  LowStockAlertDTO,
} from "../validators/analytics.schema";
import { SalesTrendChart } from "./sales-trend-chart";

function FormatDateTime(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Never";
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-2xl font-semibold tabular-nums">{value}</span>
      </CardContent>
    </Card>
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

const lowStockColumns: DataTableColumn<LowStockAlertDTO>[] = [
  {
    key: "product",
    header: "Product",
    cell: (alert) => (
      <>
        <Link
          href={`/manager/stock/${alert.productId}`}
          className="underline underline-offset-4"
        >
          {alert.productName}
        </Link>{" "}
        <span className="text-muted-foreground">({alert.productSku})</span>
      </>
    ),
  },
  { key: "onHand", header: "On hand (kg)", cell: (alert) => alert.quantityKg },
  {
    key: "threshold",
    header: "Threshold (kg)",
    cell: (alert) => alert.thresholdKg,
    className: "text-muted-foreground",
  },
];

const stockLevelColumns: DataTableColumn<DashboardStockLevelDTO>[] = [
  {
    key: "product",
    header: "Product",
    cell: (level) => (
      <>
        <Link
          href={`/manager/stock/${level.productId}`}
          className="underline underline-offset-4"
        >
          {level.productName}
        </Link>{" "}
        <span className="text-muted-foreground">({level.productSku})</span>
      </>
    ),
  },
  {
    key: "quantity",
    header: "Quantity (kg)",
    cell: (level) => level.quantityKg,
  },
  {
    key: "updated",
    header: "Last updated",
    cell: (level) => FormatDateTime(level.updatedAt),
    className: "text-muted-foreground",
  },
];

const loanColumns: DataTableColumn<DashboardLoanAccountDTO>[] = [
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
        <DataTable
          columns={lowStockColumns}
          data={data.lowStockAlerts}
          getRowKey={(alert) => alert.productId}
          emptyMessage="No products are below their low-stock threshold."
        />
      </Section>

      <Section title="Stock levels" description="Current balance per product.">
        <DataTable
          columns={stockLevelColumns}
          data={data.stockLevels}
          getRowKey={(level) => level.productId}
          emptyMessage="No products yet."
        />
      </Section>

      <Section
        title="Loan exposure"
        description="Customer loan account balances, highest first."
      >
        <DataTable
          columns={loanColumns}
          data={data.loanAccounts}
          getRowKey={(account) => account.id}
          emptyMessage="No loan accounts yet."
        />
      </Section>
    </div>
  );
}
