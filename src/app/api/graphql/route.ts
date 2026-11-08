import { createSchema, createYoga } from "graphql-yoga";
import type { NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { CreateGraphqlRoute } from "@/lib/api-handlers/graphql.handler";
import { prisma } from "@/lib/prisma";

const typeDefs = /* GraphQL */ `
  type HealthStatus {
    status: String!
    service: String!
    time: String!
  }

  type SalesTrendPoint {
    date: String!
    totalAmount: String!
    saleCount: Int!
  }

  type DashboardStockLevel {
    productId: String!
    productName: String!
    productSku: String!
    quantityKg: String!
    updatedAt: String
  }

  type DashboardLoanAccount {
    id: String!
    customerId: String!
    customerName: String!
    balance: String!
    updatedAt: String!
  }

  type LowStockAlert {
    productId: String!
    productName: String!
    productSku: String!
    quantityKg: String!
    thresholdKg: String!
  }

  type ManagerDashboard {
    salesTrend: [SalesTrendPoint!]!
    salesTotalLast30Days: String!
    stockLevels: [DashboardStockLevel!]!
    loanAccounts: [DashboardLoanAccount!]!
    totalLoanExposure: String!
    lowStockAlerts: [LowStockAlert!]!
  }

  type Query {
    health: HealthStatus!
    dashboard: ManagerDashboard!
  }
`;

// Daily totals, last 30 days (today inclusive) — see docs/DECISIONS.md,
// "Epic 8 decisions" for why this window/grouping was picked over others.
const TREND_WINDOW_DAYS = 30;

function DateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function BuildSalesTrend() {
  const today = new Date();
  const windowStart = new Date(today);
  windowStart.setUTCDate(windowStart.getUTCDate() - (TREND_WINDOW_DAYS - 1));
  windowStart.setUTCHours(0, 0, 0, 0);

  const sales = await prisma.sale.findMany({
    where: { createdAt: { gte: windowStart } },
    select: { createdAt: true, totalAmount: true },
  });

  const byDay = new Map<
    string,
    { totalAmount: Prisma.Decimal; saleCount: number }
  >();

  for (const sale of sales) {
    const key = DateKey(sale.createdAt);
    const existing = byDay.get(key);

    if (existing) {
      existing.totalAmount = existing.totalAmount.plus(sale.totalAmount);
      existing.saleCount += 1;
    } else {
      byDay.set(key, { totalAmount: sale.totalAmount, saleCount: 1 });
    }
  }

  const trend: { date: string; totalAmount: string; saleCount: number }[] = [];
  let runningTotal = new Prisma.Decimal(0);

  for (let i = 0; i < TREND_WINDOW_DAYS; i++) {
    const day = new Date(windowStart);
    day.setUTCDate(day.getUTCDate() + i);
    const key = DateKey(day);
    const bucket = byDay.get(key);

    trend.push({
      date: key,
      totalAmount: (bucket?.totalAmount ?? new Prisma.Decimal(0)).toString(),
      saleCount: bucket?.saleCount ?? 0,
    });

    if (bucket) {
      runningTotal = runningTotal.plus(bucket.totalAmount);
    }
  }

  return {
    salesTrend: trend,
    salesTotalLast30Days: runningTotal.toString(),
  };
}

async function BuildStockSections() {
  const products = await prisma.product.findMany({
    include: { stockBalance: true },
    orderBy: { name: "asc" },
  });

  const stockLevels = products.map((product) => ({
    productId: product.id,
    productName: product.name,
    productSku: product.sku,
    quantityKg: (
      product.stockBalance?.quantityKg ?? new Prisma.Decimal(0)
    ).toString(),
    updatedAt: product.stockBalance?.updatedAt.toISOString() ?? null,
  }));

  // Opt-in per product (lowStockThresholdKg is nullable) — only
  // active products with a threshold set, and only when the current
  // balance is actually below it. See docs/DECISIONS.md.
  const lowStockAlerts = products
    .filter(
      (product) =>
        product.isActive &&
        product.lowStockThresholdKg !== null &&
        (product.stockBalance?.quantityKg ?? new Prisma.Decimal(0)).lessThan(
          product.lowStockThresholdKg,
        ),
    )
    .map((product) => ({
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      quantityKg: (
        product.stockBalance?.quantityKg ?? new Prisma.Decimal(0)
      ).toString(),
      // Non-null by the filter above.
      thresholdKg: product.lowStockThresholdKg?.toString() ?? "0",
    }));

  return { stockLevels, lowStockAlerts };
}

async function BuildLoanSection() {
  const accounts = await prisma.loanAccount.findMany({
    include: { customer: true },
    orderBy: { balance: "desc" },
  });

  const loanAccounts = accounts.map((account) => ({
    id: account.id,
    customerId: account.customerId,
    customerName: account.customer.name,
    balance: account.balance.toString(),
    updatedAt: account.updatedAt.toISOString(),
  }));

  // "Exposure" = what customers currently owe the business — a negative
  // balance (business owes the customer, e.g. an unredeemed advance) isn't
  // risk exposure, so it's excluded from the total rather than netted
  // against it. See docs/DECISIONS.md and the LoanAccount.balance sign
  // convention entry it references.
  const totalLoanExposure = accounts
    .filter((account) => account.balance.greaterThan(0))
    .reduce((sum, account) => sum.plus(account.balance), new Prisma.Decimal(0))
    .toString();

  return { loanAccounts, totalLoanExposure };
}

const resolvers = {
  Query: {
    health: CreateGraphqlRoute({
      moduleName: "health",
      requiresAuth: { status: false },
      handler: async () => ({
        status: "ok",
        service: "adika-candle",
        time: new Date().toISOString(),
      }),
    }),
    dashboard: CreateGraphqlRoute({
      moduleName: "dashboard",
      requiresAuth: { status: true, permission: "analytics:read" },
      handler: async () => {
        const [trend, stock, loans] = await Promise.all([
          BuildSalesTrend(),
          BuildStockSections(),
          BuildLoanSection(),
        ]);

        return {
          ...trend,
          ...stock,
          ...loans,
        };
      },
    }),
  },
};

const { handleRequest } = createYoga({
  schema: createSchema({ typeDefs, resolvers }),
  graphqlEndpoint: "/api/graphql",
});

function handler(request: NextRequest) {
  return handleRequest(request, {});
}

export { handler as GET, handler as POST };
