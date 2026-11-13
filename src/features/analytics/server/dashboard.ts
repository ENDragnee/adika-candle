import { NeedsStockAttention } from "@/features/stock/stock-status";
import { AddBusinessDays, StartOfBusinessDay } from "@/lib/business-time";
import { prisma } from "@/lib/prisma";
import { Sum } from "./decimal";
import { BuildDailyWindow } from "./periods";
import { ComputeStockHealth, LoadStockHealthInput } from "./stock-health";

export const DASHBOARD_TREND_DAYS = 30;
export const STALE_DEBT_DAYS = 30;
const TOP_DEBTORS_LIMIT = 5;

export type AttentionSeverity = "critical" | "warning" | "info";

// Structured, not pre-written copy: the client turns each kind into a
// sentence with its own money/kg/date formatters, so the server never
// bakes unformatted numbers or UTC timestamps into user-facing text.
export interface AttentionItem {
  id: string;
  kind:
    | "NEGATIVE_STOCK"
    | "OUT_OF_STOCK"
    | "LOW_STOCK"
    | "NO_PRICE"
    | "NO_COST"
    | "NEGATIVE_MATERIAL"
    | "STALE_DEBT";
  severity: AttentionSeverity;
  subjectName: string;
  href: string;
  quantityKg: string | null;
  thresholdKg: string | null;
  daysOfCover: string | null;
  amount: string | null;
  lastPaymentAt: string | null;
}

function Item(
  fields: Pick<
    AttentionItem,
    "id" | "kind" | "severity" | "subjectName" | "href"
  > &
    Partial<AttentionItem>,
): AttentionItem {
  return {
    quantityKg: null,
    thresholdKg: null,
    daysOfCover: null,
    amount: null,
    lastPaymentAt: null,
    ...fields,
  };
}

const SEVERITY_ORDER: Record<AttentionSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

async function BuildSales(now: Date) {
  const window = BuildDailyWindow(now, DASHBOARD_TREND_DAYS * 2);
  const priorWindow = window.slice(0, DASHBOARD_TREND_DAYS);
  const currentWindow = window.slice(DASHBOARD_TREND_DAYS);

  const sales = await prisma.sale.findMany({
    where: { createdAt: { gte: window[0].start }, voidedAt: null },
    select: { createdAt: true, totalAmount: true, paymentType: true },
  });

  const InDays = (days: typeof window) =>
    sales.filter(
      (sale) =>
        sale.createdAt >= days[0].start &&
        sale.createdAt < days[days.length - 1].end,
    );

  const trend = currentWindow.map((day) => {
    const daySales = sales.filter(
      (sale) => sale.createdAt >= day.start && sale.createdAt < day.end,
    );
    const cash = Sum(
      daySales.filter((sale) => sale.paymentType === "CASH"),
      (sale) => sale.totalAmount,
    );
    const onAccount = Sum(
      daySales.filter((sale) => sale.paymentType === "LOAN"),
      (sale) => sale.totalAmount,
    );
    return {
      date: day.key,
      totalAmount: cash.plus(onAccount).toString(),
      cashAmount: cash.toString(),
      onAccountAmount: onAccount.toString(),
      saleCount: daySales.length,
    };
  });

  const today = trend[trend.length - 1];
  const yesterday = trend[trend.length - 2];

  return {
    today: {
      salesAmount: today.totalAmount,
      cashAmount: today.cashAmount,
      onAccountAmount: today.onAccountAmount,
      saleCount: today.saleCount,
      yesterdaySalesAmount: yesterday.totalAmount,
    },
    salesTrend: trend,
    salesTotalLast30Days: Sum(
      InDays(currentWindow),
      (sale) => sale.totalAmount,
    ).toString(),
    salesTotalPrior30Days: Sum(
      InDays(priorWindow),
      (sale) => sale.totalAmount,
    ).toString(),
  };
}

async function BuildReceivables(now: Date) {
  const [accounts, lastPayments, firstActivity] = await Promise.all([
    prisma.loanAccount.findMany({
      where: { customer: { isActive: true } },
      include: { customer: true },
      orderBy: { balance: "desc" },
    }),
    prisma.loanTransaction.groupBy({
      by: ["loanAccountId"],
      where: { type: "REPAYMENT_RECEIVED" },
      _max: { createdAt: true },
    }),
    prisma.loanTransaction.groupBy({
      by: ["loanAccountId"],
      _min: { createdAt: true },
    }),
  ]);
  const lastPaymentBy = new Map(
    lastPayments.map((row) => [row.loanAccountId, row._max.createdAt]),
  );
  const firstActivityBy = new Map(
    firstActivity.map((row) => [row.loanAccountId, row._min.createdAt]),
  );

  const debtors = accounts.filter((account) => account.balance.greaterThan(0));
  const creditors = accounts.filter((account) => account.balance.lessThan(0));
  const staleBefore = AddBusinessDays(
    StartOfBusinessDay(now),
    -STALE_DEBT_DAYS,
  );

  const staleDebtors = debtors.filter((account) => {
    const reference =
      lastPaymentBy.get(account.id) ?? firstActivityBy.get(account.id);
    return (
      reference !== null && reference !== undefined && reference < staleBefore
    );
  });

  return {
    receivables: {
      owedToUs: Sum(debtors, (account) => account.balance).toString(),
      customerCredit: Sum(creditors, (account) => account.balance)
        .negated()
        .toString(),
      debtorCount: debtors.length,
      creditCount: creditors.length,
    },
    topDebtors: debtors.slice(0, TOP_DEBTORS_LIMIT).map((account) => ({
      accountId: account.id,
      customerId: account.customerId,
      customerName: account.customer.name,
      balance: account.balance.toString(),
      lastPaymentAt: lastPaymentBy.get(account.id)?.toISOString() ?? null,
    })),
    staleDebtors,
    lastPaymentBy,
  };
}

export async function BuildManagerDashboard(now = new Date()) {
  const [sales, receivables, stockInput, catalog, materials] =
    await Promise.all([
      BuildSales(now),
      BuildReceivables(now),
      LoadStockHealthInput(now),
      prisma.product.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          prices: { where: { effectiveTo: null }, select: { id: true } },
          costs: { where: { effectiveTo: null }, select: { id: true } },
        },
        orderBy: { name: "asc" },
      }),
      prisma.rawMaterial.findMany({
        where: { isActive: true, balance: { quantityKg: { lt: 0 } } },
        include: { balance: true },
      }),
    ]);

  const stockHealth = ComputeStockHealth(stockInput);
  const attention: AttentionItem[] = [];

  for (const row of stockHealth.rows) {
    if (!NeedsStockAttention(row.status)) continue;
    attention.push(
      Item({
        id: `stock-${row.productId}`,
        kind:
          row.status === "NEGATIVE"
            ? "NEGATIVE_STOCK"
            : row.status === "OUT_OF_STOCK"
              ? "OUT_OF_STOCK"
              : "LOW_STOCK",
        severity:
          row.status === "NEGATIVE" || row.status === "OUT_OF_STOCK"
            ? "critical"
            : "warning",
        subjectName: row.productName,
        href: `/manager/stock/${row.productId}`,
        quantityKg: row.quantityKg,
        thresholdKg: row.thresholdKg,
        daysOfCover: row.daysOfCover,
      }),
    );
  }

  for (const material of materials) {
    attention.push(
      Item({
        id: `material-${material.id}`,
        kind: "NEGATIVE_MATERIAL",
        severity: "critical",
        subjectName: material.name,
        href: `/manager/materials/${material.id}`,
        quantityKg: material.balance?.quantityKg.toString() ?? "0",
      }),
    );
  }

  for (const product of catalog) {
    if (product.prices.length === 0) {
      attention.push(
        Item({
          id: `price-${product.id}`,
          kind: "NO_PRICE",
          severity: "critical",
          subjectName: product.name,
          href: `/manager/products/${product.id}?tab=prices`,
        }),
      );
    } else if (product.costs.length === 0) {
      attention.push(
        Item({
          id: `cost-${product.id}`,
          kind: "NO_COST",
          severity: "info",
          subjectName: product.name,
          href: `/manager/products/${product.id}?tab=costs`,
        }),
      );
    }
  }

  for (const account of receivables.staleDebtors) {
    attention.push(
      Item({
        id: `debt-${account.id}`,
        kind: "STALE_DEBT",
        severity: "warning",
        subjectName: account.customer.name,
        href: `/manager/customers/${account.customerId}`,
        amount: account.balance.toString(),
        lastPaymentAt:
          receivables.lastPaymentBy.get(account.id)?.toISOString() ?? null,
      }),
    );
  }

  attention.sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );

  return {
    ...sales,
    receivables: receivables.receivables,
    topDebtors: receivables.topDebtors,
    stockDistribution: stockHealth.distribution,
    attention,
  };
}
