import { axiosInstance } from "@/lib/axios";
import {
  type ManagerDashboardDTO,
  ManagerDashboardSchema,
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
