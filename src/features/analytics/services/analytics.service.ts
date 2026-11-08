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
      salesTrend {
        date
        totalAmount
        saleCount
      }
      salesTotalLast30Days
      stockLevels {
        productId
        productName
        productSku
        quantityKg
        updatedAt
      }
      loanAccounts {
        id
        customerId
        customerName
        balance
        updatedAt
      }
      totalLoanExposure
      lowStockAlerts {
        productId
        productName
        productSku
        quantityKg
        thresholdKg
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
  query ProductionReport($granularity: ReportGranularity!) {
    productionReport(granularity: $granularity) {
      granularity
      periodLabel
      materials {
        materialId
        materialName
        openingKg
        receivedKg
        consumedKg
        closingKg
      }
      products {
        productId
        productName
        productSku
        openingKg
        receivedKg
        consumedKg
        closingKg
        expectedOutputKg
        variancePercent
      }
      trend {
        periodLabel
        materialConsumedKg
        productActualOutputKg
      }
    }
  }
`;

export async function FetchProductionReport(
  granularity: ReportGranularity,
): Promise<ProductionReportDTO> {
  const result = await RunGraphqlQuery<{ productionReport: unknown }>(
    PRODUCTION_REPORT_QUERY,
    { granularity },
  );
  return ProductionReportSchema.parse(result.productionReport);
}

const PROFITABILITY_QUERY = /* GraphQL */ `
  query Profitability($days: Int) {
    profitability(days: $days) {
      stats {
        totalRevenue
        totalCost
        totalProfit
        averageMarginPercent
        includedSaleCount
        excludedSaleCount
      }
      trend {
        date
        marginPercent
      }
      products {
        productId
        productName
        productSku
        sellPricePerKg
        costPerKg
        marginPercent
        unitsSoldKg
        totalProfit
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
