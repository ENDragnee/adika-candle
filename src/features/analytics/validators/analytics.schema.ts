import { z } from "zod";

export const SalesTrendPointSchema = z.object({
  date: z.string(),
  totalAmount: z.string(),
  saleCount: z.number().int(),
});

export type SalesTrendPointDTO = z.infer<typeof SalesTrendPointSchema>;

export const DashboardStockLevelSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  productSku: z.string(),
  quantityKg: z.string(),
  updatedAt: z.string().nullable(),
});

export type DashboardStockLevelDTO = z.infer<typeof DashboardStockLevelSchema>;

export const DashboardLoanAccountSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  customerName: z.string(),
  balance: z.string(),
  updatedAt: z.string(),
});

export type DashboardLoanAccountDTO = z.infer<
  typeof DashboardLoanAccountSchema
>;

export const LowStockAlertSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  productSku: z.string(),
  quantityKg: z.string(),
  thresholdKg: z.string(),
});

export type LowStockAlertDTO = z.infer<typeof LowStockAlertSchema>;

export const ManagerDashboardSchema = z.object({
  salesTrend: z.array(SalesTrendPointSchema),
  salesTotalLast30Days: z.string(),
  stockLevels: z.array(DashboardStockLevelSchema),
  loanAccounts: z.array(DashboardLoanAccountSchema),
  totalLoanExposure: z.string(),
  lowStockAlerts: z.array(LowStockAlertSchema),
});

export type ManagerDashboardDTO = z.infer<typeof ManagerDashboardSchema>;
