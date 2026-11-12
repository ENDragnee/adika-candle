"use client";

import { useQuery } from "@tanstack/react-query";
import {
  type DateRangeArgs,
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
  offset: number,
  enabled: boolean,
  range: DateRangeArgs = {},
) {
  return useQuery({
    queryKey: [
      "analytics",
      "production-report",
      granularity,
      offset,
      range,
    ] as const,
    queryFn: () => FetchProductionReport(granularity, offset, range),
    enabled,
    // Keep the previous period on screen while the next one loads, so
    // stepping through periods doesn't flash a skeleton.
    placeholderData: (previous) => previous,
  });
}

export function useProfitability(range: DateRangeArgs, enabled: boolean) {
  return useQuery({
    queryKey: ["analytics", "profitability", range] as const,
    queryFn: () => FetchProfitability(range),
    enabled,
    placeholderData: (previous) => previous,
  });
}

export function useStockHealth(enabled: boolean) {
  return useQuery({
    queryKey: ["analytics", "stock-health"] as const,
    queryFn: () => FetchStockHealth(),
    enabled,
  });
}

export function useBestSellers(range: DateRangeArgs, enabled: boolean) {
  return useQuery({
    queryKey: ["analytics", "best-sellers", range] as const,
    queryFn: () => FetchBestSellers(range),
    enabled,
    placeholderData: (previous) => previous,
  });
}
