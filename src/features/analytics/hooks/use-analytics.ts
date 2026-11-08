"use client";

import { useQuery } from "@tanstack/react-query";
import { FetchManagerDashboard } from "../services/analytics.service";

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
