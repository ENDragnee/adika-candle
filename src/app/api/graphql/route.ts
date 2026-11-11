import { createSchema, createYoga } from "graphql-yoga";
import type { NextRequest } from "next/server";
import { z } from "zod";
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

  # -------------------------------------------------------------------------
  # Epic 17 — Analytics Hub. Each tab is its own focused query, fetched
  # lazily when that tab is first opened (not one combined mega-query like
  # ManagerDashboard above) — see docs/epics/17-analytics-hub.md.
  # -------------------------------------------------------------------------

  enum ReportGranularity {
    DAY
    WEEK
    MONTH
  }

  type MaterialProductionRow {
    materialId: String!
    materialName: String!
    openingKg: String!
    receivedKg: String!
    consumedKg: String!
    closingKg: String!
  }

  type ProductProductionRow {
    productId: String!
    productName: String!
    productSku: String!
    openingKg: String!
    receivedKg: String!
    consumedKg: String!
    closingKg: String!
    # Both null when the product has no Epic 14 recipe row — never blocks
    # the row, just omits the comparison.
    expectedOutputKg: String
    variancePercent: String
  }

  type ProductionTrendPoint {
    periodLabel: String!
    materialConsumedKg: String!
    productActualOutputKg: String!
  }

  type ProductionReport {
    granularity: ReportGranularity!
    periodLabel: String!
    materials: [MaterialProductionRow!]!
    products: [ProductProductionRow!]!
    trend: [ProductionTrendPoint!]!
  }

  type ProfitabilityStats {
    totalRevenue: String!
    totalCost: String!
    totalProfit: String!
    averageMarginPercent: String!
    includedSaleCount: Int!
    excludedSaleCount: Int!
  }

  type MarginTrendPoint {
    date: String!
    marginPercent: String!
  }

  type ProductMarginRow {
    productId: String!
    productName: String!
    productSku: String!
    sellPricePerKg: String
    costPerKg: String
    marginPercent: String
    unitsSoldKg: String!
    totalProfit: String!
  }

  type Profitability {
    stats: ProfitabilityStats!
    trend: [MarginTrendPoint!]!
    products: [ProductMarginRow!]!
  }

  enum StockHealthStatus {
    OUT_OF_STOCK
    CRITICAL
    LOW
    HEALTHY
    OVERSTOCKED
  }

  type StockHealthRow {
    productId: String!
    productName: String!
    productSku: String!
    quantityKg: String!
    thresholdKg: String
    status: StockHealthStatus!
    averageDailySalesKg: String!
    daysOfCover: String
  }

  type StockHealthBucket {
    status: StockHealthStatus!
    count: Int!
  }

  type StockHealth {
    distribution: [StockHealthBucket!]!
    rows: [StockHealthRow!]!
  }

  type BestSellerRow {
    productId: String!
    productName: String!
    productSku: String!
    categoryName: String!
    unitsSoldKg: String!
    revenue: String!
    priorUnitsSoldKg: String!
    priorRevenue: String!
  }

  type BestSellers {
    periodDays: Int!
    byQuantity: [BestSellerRow!]!
    byRevenue: [BestSellerRow!]!
  }

  type Query {
    health: HealthStatus!
    dashboard: ManagerDashboard!
    productionReport(granularity: ReportGranularity!): ProductionReport!
    profitability(days: Int): Profitability!
    stockHealth: StockHealth!
    bestSellers(days: Int): BestSellers!
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

// ---------------------------------------------------------------------------
// Epic 17 — Analytics Hub resolvers. Period boundaries are computed in UTC,
// matching BuildSalesTrend's own convention above. "Current period" always
// ends after `now` (e.g. today's end-of-day is in the future relative to
// `now`), so every report's "closing" figure reads the live cached balance
// (StockBalance/RawMaterialBalance) rather than a historical snapshot —
// consistent with the paper report being filled in as the day progresses.
// See docs/DECISIONS.md, "Epic 17 decisions" for the period/variance/status
// judgment calls called out inline below.
// ---------------------------------------------------------------------------

type ReportGranularity = "DAY" | "WEEK" | "MONTH";

const TREND_PERIOD_COUNTS: Record<ReportGranularity, number> = {
  DAY: 14,
  WEEK: 8,
  MONTH: 6,
};

function StartOfPeriod(granularity: ReportGranularity, date: Date): Date {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  if (granularity === "MONTH") {
    start.setUTCDate(1);
    return start;
  }
  if (granularity === "WEEK") {
    const day = start.getUTCDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    start.setUTCDate(start.getUTCDate() - diffToMonday);
  }
  return start;
}

function AddPeriods(
  granularity: ReportGranularity,
  date: Date,
  count: number,
): Date {
  const result = new Date(date);
  if (granularity === "DAY") result.setUTCDate(result.getUTCDate() + count);
  else if (granularity === "WEEK")
    result.setUTCDate(result.getUTCDate() + count * 7);
  else result.setUTCMonth(result.getUTCMonth() + count);
  return result;
}

function FormatPeriodLabel(
  granularity: ReportGranularity,
  start: Date,
): string {
  if (granularity === "MONTH") return start.toISOString().slice(0, 7);
  if (granularity === "WEEK")
    return `Week of ${start.toISOString().slice(0, 10)}`;
  return start.toISOString().slice(0, 10);
}

interface PeriodBounds {
  start: Date;
  end: Date;
  label: string;
}

function BuildPeriodWindow(
  granularity: ReportGranularity,
  now: Date,
): PeriodBounds[] {
  const count = TREND_PERIOD_COUNTS[granularity];
  const currentStart = StartOfPeriod(granularity, now);
  const periods: PeriodBounds[] = [];

  for (let i = count - 1; i >= 0; i--) {
    const start = AddPeriods(granularity, currentStart, -i);
    const end = AddPeriods(granularity, start, 1);
    periods.push({ start, end, label: FormatPeriodLabel(granularity, start) });
  }

  return periods;
}

function SumDecimal<T>(
  items: T[],
  pick: (item: T) => Prisma.Decimal,
): Prisma.Decimal {
  return items.reduce(
    (sum, item) => sum.plus(pick(item)),
    new Prisma.Decimal(0),
  );
}

async function BuildProductionReport(granularity: ReportGranularity) {
  const periods = BuildPeriodWindow(granularity, new Date());
  const currentPeriod = periods[periods.length - 1];
  const windowStart = periods[0].start;

  const [materials, products, materialEntries, stockEntries, requirements] =
    await Promise.all([
      prisma.rawMaterial.findMany({ include: { balance: true } }),
      prisma.product.findMany({ include: { stockBalance: true } }),
      prisma.rawMaterialLedgerEntry.findMany({
        where: { createdAt: { gte: windowStart } },
      }),
      prisma.stockLedgerEntry.findMany({
        where: { createdAt: { gte: windowStart } },
      }),
      prisma.productMaterialRequirement.findMany(),
    ]);

  const InCurrentPeriod = (createdAt: Date) =>
    createdAt >= currentPeriod.start && createdAt < currentPeriod.end;

  const materialConsumedCurrent = new Map<string, Prisma.Decimal>();

  const materialRows = materials.map((material) => {
    const closing = material.balance?.quantityKg ?? new Prisma.Decimal(0);
    const current = materialEntries.filter(
      (entry) =>
        entry.materialId === material.id && InCurrentPeriod(entry.createdAt),
    );
    const received = SumDecimal(
      current.filter((entry) => entry.type === "RECEIVED"),
      (entry) => entry.quantityKg,
    );
    const consumed = SumDecimal(
      current.filter((entry) => entry.type === "CONSUMED"),
      (entry) => entry.quantityKg,
    );
    const opening = closing.minus(received).plus(consumed);
    materialConsumedCurrent.set(material.id, consumed);

    return {
      materialId: material.id,
      materialName: material.name,
      openingKg: opening.toString(),
      receivedKg: received.toString(),
      consumedKg: consumed.toString(),
      closingKg: closing.toString(),
    };
  });

  const requirementsByProduct = new Map<string, typeof requirements>();
  for (const requirement of requirements) {
    const list = requirementsByProduct.get(requirement.productId) ?? [];
    list.push(requirement);
    requirementsByProduct.set(requirement.productId, list);
  }

  const productRows = products.map((product) => {
    const closing = product.stockBalance?.quantityKg ?? new Prisma.Decimal(0);
    const current = stockEntries.filter(
      (entry) =>
        entry.productId === product.id && InCurrentPeriod(entry.createdAt),
    );
    const received = SumDecimal(
      current.filter((entry) => entry.type === "ACCEPT"),
      (entry) => entry.quantityKg,
    );
    // SALE entries store a negative magnitude; "consumption" here reads as
    // the positive amount sold, matching the paper form's own framing.
    const consumed = SumDecimal(
      current.filter((entry) => entry.type === "SALE"),
      (entry) => entry.quantityKg.abs(),
    );
    const opening = closing.minus(received).plus(consumed);

    const requirementRows = requirementsByProduct.get(product.id) ?? [];
    let expectedOutputKg: string | null = null;
    let variancePercent: string | null = null;

    if (requirementRows.length > 0) {
      // "Expected output" is bottlenecked by whichever required material
      // would run out soonest — the minimum across all of this product's
      // recipe rows, each computed as (that material's total period
      // consumption) ÷ (kg of material per kg of output). Raw-material
      // consumption isn't attributed per-product (Epic 14's "free-standing
      // daily entry" decision), so this is an estimate when a material is
      // shared across multiple products' recipes — documented, not a bug.
      const candidates = requirementRows.map((requirement) => {
        const materialConsumed =
          materialConsumedCurrent.get(requirement.materialId) ??
          new Prisma.Decimal(0);
        return materialConsumed.dividedBy(requirement.quantityKgPerOutputKg);
      });
      const expected = candidates.reduce((min, value) =>
        value.lessThan(min) ? value : min,
      );
      expectedOutputKg = expected.toString();
      if (expected.greaterThan(0)) {
        variancePercent = received
          .minus(expected)
          .dividedBy(expected)
          .times(100)
          .toFixed(1);
      }
    }

    return {
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      openingKg: opening.toString(),
      receivedKg: received.toString(),
      consumedKg: consumed.toString(),
      closingKg: closing.toString(),
      expectedOutputKg,
      variancePercent,
    };
  });

  const trend = periods.map((period) => {
    const materialConsumed = SumDecimal(
      materialEntries.filter(
        (entry) =>
          entry.type === "CONSUMED" &&
          entry.createdAt >= period.start &&
          entry.createdAt < period.end,
      ),
      (entry) => entry.quantityKg,
    );
    const productOutput = SumDecimal(
      stockEntries.filter(
        (entry) =>
          entry.type === "ACCEPT" &&
          entry.createdAt >= period.start &&
          entry.createdAt < period.end,
      ),
      (entry) => entry.quantityKg,
    );

    return {
      periodLabel: period.label,
      materialConsumedKg: materialConsumed.toString(),
      productActualOutputKg: productOutput.toString(),
    };
  });

  return {
    granularity,
    periodLabel: currentPeriod.label,
    materials: materialRows,
    products: productRows,
    trend,
  };
}

const DEFAULT_PROFITABILITY_WINDOW_DAYS = 30;

async function BuildProfitability(days: number) {
  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setUTCDate(windowStart.getUTCDate() - (days - 1));
  windowStart.setUTCHours(0, 0, 0, 0);

  const sales = await prisma.sale.findMany({
    where: { createdAt: { gte: windowStart } },
    include: { product: true },
  });

  let totalRevenue = new Prisma.Decimal(0);
  let totalCost = new Prisma.Decimal(0);
  let includedSaleCount = 0;
  let excludedSaleCount = 0;

  const byDay = new Map<
    string,
    { revenue: Prisma.Decimal; cost: Prisma.Decimal }
  >();
  const byProduct = new Map<
    string,
    {
      productName: string;
      productSku: string;
      unitsSoldKg: Prisma.Decimal;
      revenue: Prisma.Decimal;
      cost: Prisma.Decimal;
      hasCost: boolean;
    }
  >();

  for (const sale of sales) {
    totalRevenue = totalRevenue.plus(sale.totalAmount);

    const dayKey = sale.createdAt.toISOString().slice(0, 10);
    const dayBucket = byDay.get(dayKey) ?? {
      revenue: new Prisma.Decimal(0),
      cost: new Prisma.Decimal(0),
    };
    dayBucket.revenue = dayBucket.revenue.plus(sale.totalAmount);

    const productBucket = byProduct.get(sale.productId) ?? {
      productName: sale.product.name,
      productSku: sale.product.sku,
      unitsSoldKg: new Prisma.Decimal(0),
      revenue: new Prisma.Decimal(0),
      cost: new Prisma.Decimal(0),
      hasCost: false,
    };
    productBucket.unitsSoldKg = productBucket.unitsSoldKg.plus(sale.quantityKg);
    productBucket.revenue = productBucket.revenue.plus(sale.totalAmount);

    if (sale.costPerKgAtSale !== null) {
      const costAmount = sale.costPerKgAtSale.times(sale.quantityKg);
      totalCost = totalCost.plus(costAmount);
      dayBucket.cost = dayBucket.cost.plus(costAmount);
      productBucket.cost = productBucket.cost.plus(costAmount);
      productBucket.hasCost = true;
      includedSaleCount += 1;
    } else {
      excludedSaleCount += 1;
    }

    byDay.set(dayKey, dayBucket);
    byProduct.set(sale.productId, productBucket);
  }

  const totalProfit = totalRevenue.minus(totalCost);
  const averageMarginPercent = totalRevenue.greaterThan(0)
    ? totalProfit.dividedBy(totalRevenue).times(100).toFixed(1)
    : "0";

  const trend: { date: string; marginPercent: string }[] = [];
  for (let i = 0; i < days; i++) {
    const day = new Date(windowStart);
    day.setUTCDate(day.getUTCDate() + i);
    const key = day.toISOString().slice(0, 10);
    const bucket = byDay.get(key);
    const marginPercent =
      bucket && bucket.revenue.greaterThan(0)
        ? bucket.revenue
            .minus(bucket.cost)
            .dividedBy(bucket.revenue)
            .times(100)
            .toFixed(1)
        : "0";
    trend.push({ date: key, marginPercent });
  }

  const productIds = [...byProduct.keys()];
  const [activePrices, activeCosts] = await Promise.all([
    prisma.price.findMany({
      where: { productId: { in: productIds }, effectiveTo: null },
    }),
    prisma.cost.findMany({
      where: { productId: { in: productIds }, effectiveTo: null },
    }),
  ]);
  const priceByProduct = new Map(
    activePrices.map((price) => [price.productId, price.amountPerKg]),
  );
  const costByProduct = new Map(
    activeCosts.map((cost) => [cost.productId, cost.amountPerKg]),
  );

  const products = [...byProduct.entries()]
    .sort(([, a], [, b]) => b.revenue.comparedTo(a.revenue))
    .map(([productId, bucket]) => {
      const sellPrice = priceByProduct.get(productId) ?? null;
      const cost = costByProduct.get(productId) ?? null;
      const marginPercent =
        sellPrice && cost && sellPrice.greaterThan(0)
          ? sellPrice.minus(cost).dividedBy(sellPrice).times(100).toFixed(1)
          : null;

      return {
        productId,
        productName: bucket.productName,
        productSku: bucket.productSku,
        sellPricePerKg: sellPrice?.toString() ?? null,
        costPerKg: cost?.toString() ?? null,
        marginPercent,
        unitsSoldKg: bucket.unitsSoldKg.toString(),
        totalProfit: bucket.hasCost
          ? bucket.revenue.minus(bucket.cost).toString()
          : "0",
      };
    });

  return {
    stats: {
      totalRevenue: totalRevenue.toString(),
      totalCost: totalCost.toString(),
      totalProfit: totalProfit.toString(),
      averageMarginPercent,
      includedSaleCount,
      excludedSaleCount,
    },
    trend,
    products,
  };
}

const STOCK_HEALTH_VELOCITY_WINDOW_DAYS = 30;
// Multipliers against Product.lowStockThresholdKg — a judgment call, not a
// value from the epic doc (which only specifies the 5 status names). See
// docs/DECISIONS.md.
const STOCK_HEALTH_CRITICAL_RATIO = 0.5;
const STOCK_HEALTH_OVERSTOCKED_RATIO = 3;

type StockHealthStatusValue =
  | "OUT_OF_STOCK"
  | "CRITICAL"
  | "LOW"
  | "HEALTHY"
  | "OVERSTOCKED";

async function BuildStockHealth() {
  const windowStart = new Date();
  windowStart.setUTCDate(
    windowStart.getUTCDate() - STOCK_HEALTH_VELOCITY_WINDOW_DAYS,
  );

  const [products, sales] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      include: { stockBalance: true },
    }),
    prisma.sale.findMany({
      where: { createdAt: { gte: windowStart } },
      select: { productId: true, quantityKg: true },
    }),
  ]);

  const soldByProduct = new Map<string, Prisma.Decimal>();
  for (const sale of sales) {
    soldByProduct.set(
      sale.productId,
      (soldByProduct.get(sale.productId) ?? new Prisma.Decimal(0)).plus(
        sale.quantityKg,
      ),
    );
  }

  const rows = products.map((product) => {
    const quantityKg =
      product.stockBalance?.quantityKg ?? new Prisma.Decimal(0);
    const threshold = product.lowStockThresholdKg;
    const totalSold = soldByProduct.get(product.id) ?? new Prisma.Decimal(0);
    const averageDailySalesKg = totalSold.dividedBy(
      STOCK_HEALTH_VELOCITY_WINDOW_DAYS,
    );

    let status: StockHealthStatusValue;
    if (quantityKg.lessThanOrEqualTo(0)) {
      status = "OUT_OF_STOCK";
    } else if (!threshold) {
      // No threshold configured (Epic 8's opt-in field) — can't bucket
      // Critical/Low/Overstocked without a baseline, so a stocked product
      // with none set reads as Healthy rather than blocking the report.
      status = "HEALTHY";
    } else if (
      quantityKg.lessThan(threshold.times(STOCK_HEALTH_CRITICAL_RATIO))
    ) {
      status = "CRITICAL";
    } else if (quantityKg.lessThan(threshold)) {
      status = "LOW";
    } else if (
      quantityKg.lessThanOrEqualTo(
        threshold.times(STOCK_HEALTH_OVERSTOCKED_RATIO),
      )
    ) {
      status = "HEALTHY";
    } else {
      status = "OVERSTOCKED";
    }

    const daysOfCover = averageDailySalesKg.greaterThan(0)
      ? quantityKg.dividedBy(averageDailySalesKg).toFixed(1)
      : null;

    return {
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      quantityKg: quantityKg.toString(),
      thresholdKg: threshold?.toString() ?? null,
      status,
      averageDailySalesKg: averageDailySalesKg.toFixed(3),
      daysOfCover,
    };
  });

  const STATUSES: StockHealthStatusValue[] = [
    "OUT_OF_STOCK",
    "CRITICAL",
    "LOW",
    "HEALTHY",
    "OVERSTOCKED",
  ];
  const distribution = STATUSES.map((status) => ({
    status,
    count: rows.filter((row) => row.status === status).length,
  }));

  return { distribution, rows };
}

const DEFAULT_BEST_SELLERS_WINDOW_DAYS = 7;
const BEST_SELLERS_LIMIT = 10;

async function BuildBestSellers(days: number) {
  const now = new Date();
  const currentStart = new Date(now);
  currentStart.setUTCDate(currentStart.getUTCDate() - days);
  const priorStart = new Date(currentStart);
  priorStart.setUTCDate(priorStart.getUTCDate() - days);

  const sales = await prisma.sale.findMany({
    where: { createdAt: { gte: priorStart } },
    include: { product: { include: { category: true } } },
  });

  interface Bucket {
    productName: string;
    productSku: string;
    categoryName: string;
    unitsSoldKg: Prisma.Decimal;
    revenue: Prisma.Decimal;
  }
  const current = new Map<string, Bucket>();
  const prior = new Map<string, Bucket>();

  for (const sale of sales) {
    const target = sale.createdAt >= currentStart ? current : prior;
    const bucket = target.get(sale.productId) ?? {
      productName: sale.product.name,
      productSku: sale.product.sku,
      categoryName: sale.product.category.name,
      unitsSoldKg: new Prisma.Decimal(0),
      revenue: new Prisma.Decimal(0),
    };
    bucket.unitsSoldKg = bucket.unitsSoldKg.plus(sale.quantityKg);
    bucket.revenue = bucket.revenue.plus(sale.totalAmount);
    target.set(sale.productId, bucket);
  }

  const rows = [...current.entries()].map(([productId, bucket]) => {
    const priorBucket = prior.get(productId);
    return {
      productId,
      productName: bucket.productName,
      productSku: bucket.productSku,
      categoryName: bucket.categoryName,
      unitsSoldKg: bucket.unitsSoldKg.toString(),
      revenue: bucket.revenue.toString(),
      priorUnitsSoldKg: priorBucket?.unitsSoldKg.toString() ?? "0",
      priorRevenue: priorBucket?.revenue.toString() ?? "0",
      _unitsSoldKgValue: bucket.unitsSoldKg,
      _revenueValue: bucket.revenue,
    };
  });

  const StripSortFields = <
    T extends { _unitsSoldKgValue: unknown; _revenueValue: unknown },
  >(
    row: T,
  ) => {
    const { _unitsSoldKgValue, _revenueValue, ...rest } = row;
    return rest;
  };

  const byQuantity = [...rows]
    .sort((a, b) => b._unitsSoldKgValue.comparedTo(a._unitsSoldKgValue))
    .slice(0, BEST_SELLERS_LIMIT)
    .map(StripSortFields);
  const byRevenue = [...rows]
    .sort((a, b) => b._revenueValue.comparedTo(a._revenueValue))
    .slice(0, BEST_SELLERS_LIMIT)
    .map(StripSortFields);

  return { periodDays: days, byQuantity, byRevenue };
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
    productionReport: CreateGraphqlRoute({
      moduleName: "analytics.productionReport",
      schema: z.object({ granularity: z.enum(["DAY", "WEEK", "MONTH"]) }),
      requiresAuth: { status: true, permission: "analytics:read" },
      handler: async (_parent, args: { granularity: ReportGranularity }) =>
        BuildProductionReport(args.granularity),
    }),
    profitability: CreateGraphqlRoute({
      moduleName: "analytics.profitability",
      schema: z.object({
        days: z.number().int().positive().optional(),
      }),
      requiresAuth: { status: true, permission: "analytics:read" },
      handler: async (_parent, args: { days?: number | null }) =>
        BuildProfitability(args.days ?? DEFAULT_PROFITABILITY_WINDOW_DAYS),
    }),
    stockHealth: CreateGraphqlRoute({
      moduleName: "analytics.stockHealth",
      requiresAuth: { status: true, permission: "analytics:read" },
      handler: async () => BuildStockHealth(),
    }),
    bestSellers: CreateGraphqlRoute({
      moduleName: "analytics.bestSellers",
      schema: z.object({
        days: z.number().int().positive().optional(),
      }),
      requiresAuth: { status: true, permission: "analytics:read" },
      handler: async (_parent, args: { days?: number | null }) =>
        BuildBestSellers(args.days ?? DEFAULT_BEST_SELLERS_WINDOW_DAYS),
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
