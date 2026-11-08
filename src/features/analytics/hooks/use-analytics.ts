"use client";

import { useQuery } from "@tanstack/react-query";
import {
  FetchBestSellers,
  FetchManagerDashboard,
  FetchProductionReport,
  FetchProfitability,
  FetchStockHealth,
} from "../services/analytics.service";
import type { ReportGranularity } from "../validators/analytics.schema";

export const MANAGER_DASHBOARD_QUERY_KEY = [
  "analytics",
  "manager-dashboard",
] as const;

export function useManagerDashboard() {
  return useQuery({
    queryKey: MANAGER_DASHBOARD_QUERY_KEY,
    queryFn: FetchManagerDashboard,
  });
}

// Epic 17 — each tab's query is only `enabled` once that tab has actually
// been opened (lazy fetch per the epic doc), not one combined query on
// page load.

export function useProductionReport(
  granularity: ReportGranularity,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["analytics", "production-report", granularity] as const,
    queryFn: () => FetchProductionReport(granularity),
    enabled,
  });
}

export function useProfitability(days: number, enabled: boolean) {
  return useQuery({
    queryKey: ["analytics", "profitability", days] as const,
    queryFn: () => FetchProfitability(days),
    enabled,
  });
}

export function useStockHealth(enabled: boolean) {
  return useQuery({
    queryKey: ["analytics", "stock-health"] as const,
    queryFn: () => FetchStockHealth(),
    enabled,
  });
}

export function useBestSellers(days: number, enabled: boolean) {
  return useQuery({
    queryKey: ["analytics", "best-sellers", days] as const,
    queryFn: () => FetchBestSellers(days),
    enabled,
  });
}
