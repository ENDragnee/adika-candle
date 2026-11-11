import { axiosInstance } from "@/lib/axios";
import {
  type BestSellersDTO,
  BestSellersSchema,
  type ManagerDashboardDTO,
  ManagerDashboardSchema,
  type ProductionReportDTO,
  ProductionReportSchema,
  type ProfitabilityDTO,
  ProfitabilitySchema,
  type ReportGranularity,
  type StockHealthDTO,
  StockHealthSchema,
} from "../validators/analytics.schema";

// No graphql-request/Apollo dependency in this app (see docs/DECISIONS.md) —
// a plain POST to the Yoga endpoint is enough for the one query this
// feature needs.
const MANAGER_DASHBOARD_QUERY = /* GraphQL */ `
  query ManagerDashboard {
    dashboard {
      today {
        salesAmount
        cashAmount
        onAccountAmount
        saleCount
        yesterdaySalesAmount
      }
      salesTrend {
        date
        totalAmount
        cashAmount
        onAccountAmount
        saleCount
      }
      salesTotalLast30Days
      salesTotalPrior30Days
      receivables {
        owedToUs
        customerCredit
        debtorCount
        creditCount
      }
      topDebtors {
        accountId
        customerId
        customerName
        balance
        lastPaymentAt
      }
      stockDistribution {
        status
        count
      }
      attention {
        id
        kind
        severity
        subjectName
        href
        quantityKg
        thresholdKg
        daysOfCover
        amount
        lastPaymentAt
      }
    }
  }
`;

interface GraphqlResponse<T> {
  data?: T;
  errors?: { message: string }[];
}

export async function FetchManagerDashboard(): Promise<ManagerDashboardDTO> {
  const { data } = await axiosInstance.post<
    GraphqlResponse<{ dashboard: unknown }>
  >("/api/graphql", { query: MANAGER_DASHBOARD_QUERY });

  if (data.errors?.length) {
    throw new Error(data.errors[0]?.message ?? "Failed to load dashboard");
  }

  return ManagerDashboardSchema.parse(data.data?.dashboard);
}

async function RunGraphqlQuery<T>(
  query: string,
  variables: Record<string, unknown>,
) {
  const { data } = await axiosInstance.post<GraphqlResponse<T>>(
    "/api/graphql",
    {
      query,
      variables,
    },
  );

  if (data.errors?.length) {
    throw new Error(data.errors[0]?.message ?? "Analytics query failed");
  }

  return data.data as T;
}

const PRODUCTION_REPORT_QUERY = /* GraphQL */ `
  query ProductionReport($granularity: ReportGranularity!, $offset: Int) {
    productionReport(granularity: $granularity, offset: $offset) {
      granularity
      periodLabel
      periodStart
      periodEnd
      offset
      hasNext
      materials {
        materialId
        materialName
        openingKg
        receivedKg
        consumedKg
        adjustedKg
        closingKg
      }
      products {
        productId
        productName
        productSku
        openingKg
        receivedKg
        consumedKg
        adjustedKg
        closingKg
        expectedOutputKg
        variancePercent
      }
      trend {
        periodKey
        periodLabel
        materialConsumedKg
        productActualOutputKg
      }
    }
  }
`;

export async function FetchProductionReport(
  granularity: ReportGranularity,
  offset = 0,
): Promise<ProductionReportDTO> {
  const result = await RunGraphqlQuery<{ productionReport: unknown }>(
    PRODUCTION_REPORT_QUERY,
    { granularity, offset },
  );
  return ProductionReportSchema.parse(result.productionReport);
}

const PROFITABILITY_QUERY = /* GraphQL */ `
  query Profitability($days: Int) {
    profitability(days: $days) {
      periodDays
      stats {
        totalRevenue
        costedRevenue
        totalCost
        totalProfit
        averageMarginPercent
        includedSaleCount
        excludedSaleCount
      }
      trend {
        date
        revenue
        profit
        marginPercent
      }
      products {
        productId
        productName
        productSku
        currentPricePerKg
        currentCostPerKg
        currentMarginPercent
        realizedMarginPercent
        unitsSoldKg
        revenue
        totalProfit
        uncostedSaleCount
      }
    }
  }
`;

export async function FetchProfitability(
  days?: number,
): Promise<ProfitabilityDTO> {
  const result = await RunGraphqlQuery<{ profitability: unknown }>(
    PROFITABILITY_QUERY,
    { days },
  );
  return ProfitabilitySchema.parse(result.profitability);
}

const STOCK_HEALTH_QUERY = /* GraphQL */ `
  query StockHealth {
    stockHealth {
      windowDays
      distribution {
        status
        count
      }
      rows {
        productId
        productName
        productSku
        quantityKg
        thresholdKg
        status
        averageDailySalesKg
        daysOfCover
      }
    }
  }
`;

export async function FetchStockHealth(): Promise<StockHealthDTO> {
  const result = await RunGraphqlQuery<{ stockHealth: unknown }>(
    STOCK_HEALTH_QUERY,
    {},
  );
  return StockHealthSchema.parse(result.stockHealth);
}

const BEST_SELLERS_QUERY = /* GraphQL */ `
  query BestSellers($days: Int) {
    bestSellers(days: $days) {
      periodDays
      byQuantity {
        productId
        productName
        productSku
        categoryName
        unitsSoldKg
        revenue
        priorUnitsSoldKg
        priorRevenue
      }
      byRevenue {
        productId
        productName
        productSku
        categoryName
        unitsSoldKg
        revenue
        priorUnitsSoldKg
        priorRevenue
      }
    }
  }
`;

export async function FetchBestSellers(days?: number): Promise<BestSellersDTO> {
  const result = await RunGraphqlQuery<{ bestSellers: unknown }>(
    BEST_SELLERS_QUERY,
    { days },
  );
  return BestSellersSchema.parse(result.bestSellers);
}
