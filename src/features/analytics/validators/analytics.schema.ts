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

// ---------------------------------------------------------------------------
// Epic 17 — Analytics Hub. One schema per tab query, matching the GraphQL
// types in src/app/api/graphql/route.ts 1:1.
// ---------------------------------------------------------------------------

export const ReportGranularitySchema = z.enum(["DAY", "WEEK", "MONTH"]);
export type ReportGranularity = z.infer<typeof ReportGranularitySchema>;

export const MaterialProductionRowSchema = z.object({
  materialId: z.string(),
  materialName: z.string(),
  openingKg: z.string(),
  receivedKg: z.string(),
  consumedKg: z.string(),
  closingKg: z.string(),
});
export type MaterialProductionRowDTO = z.infer<
  typeof MaterialProductionRowSchema
>;

export const ProductProductionRowSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  productSku: z.string(),
  openingKg: z.string(),
  receivedKg: z.string(),
  consumedKg: z.string(),
  closingKg: z.string(),
  expectedOutputKg: z.string().nullable(),
  variancePercent: z.string().nullable(),
});
export type ProductProductionRowDTO = z.infer<
  typeof ProductProductionRowSchema
>;

export const ProductionTrendPointSchema = z.object({
  periodLabel: z.string(),
  materialConsumedKg: z.string(),
  productActualOutputKg: z.string(),
});
export type ProductionTrendPointDTO = z.infer<
  typeof ProductionTrendPointSchema
>;

export const ProductionReportSchema = z.object({
  granularity: ReportGranularitySchema,
  periodLabel: z.string(),
  materials: z.array(MaterialProductionRowSchema),
  products: z.array(ProductProductionRowSchema),
  trend: z.array(ProductionTrendPointSchema),
});
export type ProductionReportDTO = z.infer<typeof ProductionReportSchema>;

export const ProfitabilityStatsSchema = z.object({
  totalRevenue: z.string(),
  totalCost: z.string(),
  totalProfit: z.string(),
  averageMarginPercent: z.string(),
  includedSaleCount: z.number().int(),
  excludedSaleCount: z.number().int(),
});

export const MarginTrendPointSchema = z.object({
  date: z.string(),
  marginPercent: z.string(),
});
export type MarginTrendPointDTO = z.infer<typeof MarginTrendPointSchema>;

export const ProductMarginRowSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  productSku: z.string(),
  sellPricePerKg: z.string().nullable(),
  costPerKg: z.string().nullable(),
  marginPercent: z.string().nullable(),
  unitsSoldKg: z.string(),
  totalProfit: z.string(),
});
export type ProductMarginRowDTO = z.infer<typeof ProductMarginRowSchema>;

export const ProfitabilitySchema = z.object({
  stats: ProfitabilityStatsSchema,
  trend: z.array(MarginTrendPointSchema),
  products: z.array(ProductMarginRowSchema),
});
export type ProfitabilityDTO = z.infer<typeof ProfitabilitySchema>;

export const StockHealthStatusSchema = z.enum([
  "OUT_OF_STOCK",
  "CRITICAL",
  "LOW",
  "HEALTHY",
  "OVERSTOCKED",
]);
export type StockHealthStatus = z.infer<typeof StockHealthStatusSchema>;

export const StockHealthRowSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  productSku: z.string(),
  quantityKg: z.string(),
  thresholdKg: z.string().nullable(),
  status: StockHealthStatusSchema,
  averageDailySalesKg: z.string(),
  daysOfCover: z.string().nullable(),
});
export type StockHealthRowDTO = z.infer<typeof StockHealthRowSchema>;

export const StockHealthBucketSchema = z.object({
  status: StockHealthStatusSchema,
  count: z.number().int(),
});
export type StockHealthBucketDTO = z.infer<typeof StockHealthBucketSchema>;

export const StockHealthSchema = z.object({
  distribution: z.array(StockHealthBucketSchema),
  rows: z.array(StockHealthRowSchema),
});
export type StockHealthDTO = z.infer<typeof StockHealthSchema>;

export const BestSellerRowSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  productSku: z.string(),
  categoryName: z.string(),
  unitsSoldKg: z.string(),
  revenue: z.string(),
  priorUnitsSoldKg: z.string(),
  priorRevenue: z.string(),
});
export type BestSellerRowDTO = z.infer<typeof BestSellerRowSchema>;

export const BestSellersSchema = z.object({
  periodDays: z.number().int(),
  byQuantity: z.array(BestSellerRowSchema),
  byRevenue: z.array(BestSellerRowSchema),
});
export type BestSellersDTO = z.infer<typeof BestSellersSchema>;
