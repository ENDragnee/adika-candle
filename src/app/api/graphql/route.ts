import { createSchema, createYoga } from "graphql-yoga";
import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  BuildBestSellers,
  DEFAULT_BEST_SELLERS_WINDOW_DAYS,
} from "@/features/analytics/server/best-sellers";
import { BuildManagerDashboard } from "@/features/analytics/server/dashboard";
import type { ReportGranularity } from "@/features/analytics/server/periods";
import { BuildProductionReport } from "@/features/analytics/server/production";
import {
  BuildProfitability,
  DEFAULT_PROFITABILITY_WINDOW_DAYS,
} from "@/features/analytics/server/profitability";
import { BuildStockHealth } from "@/features/analytics/server/stock-health";
import { CreateGraphqlRoute } from "@/lib/api-handlers/graphql.handler";

// Schema + resolver wiring only. The calculations live in
// src/features/analytics/server/*, where they're unit-tested without a
// database (Epic 21 split them out of this file). Money and kg values
// travel as Decimal strings; nullable figures mean "not computable" and
// the UI renders them as "—", never as 0.
const typeDefs = /* GraphQL */ `
  type HealthStatus {
    status: String!
    service: String!
    time: String!
  }

  type SalesTrendPoint {
    date: String!
    totalAmount: String!
    cashAmount: String!
    onAccountAmount: String!
    saleCount: Int!
  }

  type TodaySales {
    salesAmount: String!
    cashAmount: String!
    onAccountAmount: String!
    saleCount: Int!
    yesterdaySalesAmount: String!
  }

  type Receivables {
    owedToUs: String!
    customerCredit: String!
    debtorCount: Int!
    creditCount: Int!
  }

  type DashboardDebtor {
    accountId: String!
    customerId: String!
    customerName: String!
    balance: String!
    lastPaymentAt: String
  }

  enum AttentionSeverity {
    critical
    warning
    info
  }

  enum AttentionKind {
    NEGATIVE_STOCK
    OUT_OF_STOCK
    LOW_STOCK
    NO_PRICE
    NO_COST
    NEGATIVE_MATERIAL
    STALE_DEBT
  }

  type AttentionItem {
    id: String!
    kind: AttentionKind!
    severity: AttentionSeverity!
    subjectName: String!
    href: String!
    quantityKg: String
    thresholdKg: String
    daysOfCover: String
    amount: String
    lastPaymentAt: String
  }

  enum StockStatus {
    NEGATIVE
    OUT_OF_STOCK
    CRITICAL
    LOW
    HEALTHY
    OVERSTOCKED
    UNTRACKED
  }

  type StockStatusBucket {
    status: StockStatus!
    count: Int!
  }

  type ManagerDashboard {
    today: TodaySales!
    salesTrend: [SalesTrendPoint!]!
    salesTotalLast30Days: String!
    salesTotalPrior30Days: String!
    receivables: Receivables!
    topDebtors: [DashboardDebtor!]!
    stockDistribution: [StockStatusBucket!]!
    attention: [AttentionItem!]!
  }

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
    adjustedKg: String!
    closingKg: String!
  }

  type ProductProductionRow {
    productId: String!
    productName: String!
    productSku: String!
    openingKg: String!
    receivedKg: String!
    consumedKg: String!
    adjustedKg: String!
    closingKg: String!
    # Both null when the product has no recipe — never blocks the row.
    expectedOutputKg: String
    variancePercent: String
  }

  type ProductionTrendPoint {
    periodKey: String!
    periodLabel: String!
    materialConsumedKg: String!
    productActualOutputKg: String!
  }

  type ProductionReport {
    granularity: ReportGranularity!
    periodLabel: String!
    periodStart: String!
    periodEnd: String!
    offset: Int!
    hasNext: Boolean!
    materials: [MaterialProductionRow!]!
    products: [ProductProductionRow!]!
    trend: [ProductionTrendPoint!]!
  }

  type ProfitabilityStats {
    totalRevenue: String!
    costedRevenue: String!
    totalCost: String!
    totalProfit: String
    averageMarginPercent: String
    includedSaleCount: Int!
    excludedSaleCount: Int!
  }

  type MarginTrendPoint {
    date: String!
    revenue: String!
    profit: String
    marginPercent: String
  }

  type ProductMarginRow {
    productId: String!
    productName: String!
    productSku: String!
    currentPricePerKg: String
    currentCostPerKg: String
    currentMarginPercent: String
    realizedMarginPercent: String
    unitsSoldKg: String!
    revenue: String!
    totalProfit: String
    uncostedSaleCount: Int!
  }

  type Profitability {
    periodDays: Int!
    stats: ProfitabilityStats!
    trend: [MarginTrendPoint!]!
    products: [ProductMarginRow!]!
  }

  type StockHealthRow {
    productId: String!
    productName: String!
    productSku: String!
    quantityKg: String!
    thresholdKg: String
    status: StockStatus!
    averageDailySalesKg: String!
    daysOfCover: String
  }

  type StockHealth {
    windowDays: Int!
    distribution: [StockStatusBucket!]!
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
    productionReport(granularity: ReportGranularity!, offset: Int): ProductionReport!
    profitability(days: Int): Profitability!
    stockHealth: StockHealth!
    bestSellers(days: Int): BestSellers!
  }
`;

// Upper bound on report windows — keeps a crafted query from scanning
// years of sales in one request.
const MAX_WINDOW_DAYS = 366;

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
      handler: async () => BuildManagerDashboard(),
    }),
    productionReport: CreateGraphqlRoute({
      moduleName: "analytics.productionReport",
      schema: z.object({
        granularity: z.enum(["DAY", "WEEK", "MONTH"]),
        offset: z.number().int().max(0).min(-120).nullish(),
      }),
      requiresAuth: { status: true, permission: "analytics:read" },
      handler: async (
        _parent,
        args: { granularity: ReportGranularity; offset?: number | null },
      ) => BuildProductionReport(args.granularity, args.offset ?? 0),
    }),
    profitability: CreateGraphqlRoute({
      moduleName: "analytics.profitability",
      schema: z.object({
        days: z.number().int().positive().max(MAX_WINDOW_DAYS).nullish(),
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
        days: z.number().int().positive().max(MAX_WINDOW_DAYS).nullish(),
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
