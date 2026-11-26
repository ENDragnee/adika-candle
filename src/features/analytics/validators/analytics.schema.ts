import { z } from "zod";

export const StockStatusSchema = z.enum([
  "NEGATIVE",
  "OUT_OF_STOCK",
  "CRITICAL",
  "LOW",
  "HEALTHY",
  "OVERSTOCKED",
  "UNTRACKED",
]);
export type StockStatusValue = z.infer<typeof StockStatusSchema>;

export const StockStatusBucketSchema = z.object({
  status: StockStatusSchema,
  count: z.number().int(),
});
export type StockStatusBucketDTO = z.infer<typeof StockStatusBucketSchema>;

export const SalesTrendPointSchema = z.object({
  date: z.string(),
  totalAmount: z.string(),
  cashAmount: z.string(),
  onAccountAmount: z.string(),
  saleCount: z.number().int(),
});

export type SalesTrendPointDTO = z.infer<typeof SalesTrendPointSchema>;

export const TodaySalesSchema = z.object({
  salesAmount: z.string(),
  cashAmount: z.string(),
  onAccountAmount: z.string(),
  saleCount: z.number().int(),
  yesterdaySalesAmount: z.string(),
});

export const ReceivablesSchema = z.object({
  owedToUs: z.string(),
  customerCredit: z.string(),
  debtorCount: z.number().int(),
  creditCount: z.number().int(),
});
export type ReceivablesDTO = z.infer<typeof ReceivablesSchema>;

export const DashboardDebtorSchema = z.object({
  accountId: z.string(),
  customerId: z.string(),
  customerName: z.string(),
  balance: z.string(),
  lastPaymentAt: z.string().nullable(),
});
export type DashboardDebtorDTO = z.infer<typeof DashboardDebtorSchema>;

export const AttentionKindSchema = z.enum([
  "NEGATIVE_STOCK",
  "OUT_OF_STOCK",
  "LOW_STOCK",
  "NO_PRICE",
  "NO_COST",
  "NEGATIVE_MATERIAL",
  "STALE_DEBT",
]);
export type AttentionKind = z.infer<typeof AttentionKindSchema>;

export const AttentionItemSchema = z.object({
  id: z.string(),
  kind: AttentionKindSchema,
  severity: z.enum(["critical", "warning", "info"]),
  subjectName: z.string(),
  href: z.string(),
  quantityKg: z.string().nullable(),
  quantityCartons: z.string().nullable(),
  thresholdCartons: z.string().nullable(),
  daysOfCover: z.string().nullable(),
  amount: z.string().nullable(),
  lastPaymentAt: z.string().nullable(),
});
export type AttentionItemDTO = z.infer<typeof AttentionItemSchema>;

export const ManagerDashboardSchema = z.object({
  today: TodaySalesSchema,
  salesTrend: z.array(SalesTrendPointSchema),
  salesTotalLast30Days: z.string(),
  salesTotalPrior30Days: z.string(),
  receivables: ReceivablesSchema,
  topDebtors: z.array(DashboardDebtorSchema),
  stockDistribution: z.array(StockStatusBucketSchema),
  attention: z.array(AttentionItemSchema),
});

export type ManagerDashboardDTO = z.infer<typeof ManagerDashboardSchema>;

// ---------------------------------------------------------------------------
// Epic 17 — Analytics Hub. One schema per tab query, matching the GraphQL
// types in src/app/api/graphql/route.ts 1:1.
// ---------------------------------------------------------------------------

export const ReportGranularitySchema = z.enum(["DAY", "WEEK", "MONTH"]);
// The report itself also says CUSTOM when it was asked for a from/to range.
export const ReportKindSchema = z.enum(["DAY", "WEEK", "MONTH", "CUSTOM"]);
export type ReportGranularity = z.infer<typeof ReportGranularitySchema>;

export const MaterialProductionRowSchema = z.object({
  materialId: z.string(),
  materialName: z.string(),
  openingKg: z.string(),
  receivedKg: z.string(),
  consumedKg: z.string(),
  adjustedKg: z.string(),
  closingKg: z.string(),
});
export type MaterialProductionRowDTO = z.infer<
  typeof MaterialProductionRowSchema
>;

export const ProductProductionRowSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  productSku: z.string(),
  cartonSize: z.enum(["NORMAL", "PLUS"]),
  openingCartons: z.string(),
  producedCartons: z.string(),
  soldCartons: z.string(),
  adjustedCartons: z.string(),
  closingCartons: z.string(),
  // Wax the produced cartons took (kg).
  waxKg: z.string(),
});
export type ProductProductionRowDTO = z.infer<
  typeof ProductProductionRowSchema
>;

export const ProductionTrendPointSchema = z.object({
  periodKey: z.string(),
  periodLabel: z.string(),
  producedCartons: z.string(),
  waxExpectedKg: z.string(),
  waxActualKg: z.string(),
});
export type ProductionTrendPointDTO = z.infer<
  typeof ProductionTrendPointSchema
>;

// Under-production check — see ComputeWaxCheck in
// src/features/analytics/server/production.ts.
export const WaxCheckSchema = z.object({
  status: z.enum(["UNDER", "OVER", "OK", "NOT_COUNTED"]),
  expectedKg: z.string(),
  actualKg: z.string(),
  countCorrectionKg: z.string(),
  gapKg: z.string(),
  gapCartons: z.string(),
  hasCount: z.boolean(),
});
export type WaxCheckDTO = z.infer<typeof WaxCheckSchema>;

export const ProductionReportSchema = z.object({
  granularity: ReportKindSchema,
  periodLabel: z.string(),
  periodStart: z.string(),
  periodEnd: z.string(),
  offset: z.number().int(),
  hasNext: z.boolean(),
  waxCheck: WaxCheckSchema.nullable(),
  materials: z.array(MaterialProductionRowSchema),
  products: z.array(ProductProductionRowSchema),
  trend: z.array(ProductionTrendPointSchema),
});
export type ProductionReportDTO = z.infer<typeof ProductionReportSchema>;

export const ProfitabilityStatsSchema = z.object({
  totalRevenue: z.string(),
  // Revenue from sales that had a cost on record — the base profit and
  // margin are computed against. Profit/margin are null when it's 0.
  costedRevenue: z.string(),
  totalCost: z.string(),
  totalProfit: z.string().nullable(),
  averageMarginPercent: z.string().nullable(),
  includedSaleCount: z.number().int(),
  excludedSaleCount: z.number().int(),
});

export const MarginTrendPointSchema = z.object({
  date: z.string(),
  label: z.string(),
  revenue: z.string(),
  profit: z.string().nullable(),
  marginPercent: z.string().nullable(),
});
export type MarginTrendPointDTO = z.infer<typeof MarginTrendPointSchema>;

export const ProductMarginRowSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  productSku: z.string(),
  currentPricePerCarton: z.string().nullable(),
  currentCostPerCarton: z.string().nullable(),
  currentMarginPercent: z.string().nullable(),
  realizedMarginPercent: z.string().nullable(),
  unitsSoldCartons: z.string(),
  revenue: z.string(),
  totalProfit: z.string().nullable(),
  uncostedSaleCount: z.number().int(),
});
export type ProductMarginRowDTO = z.infer<typeof ProductMarginRowSchema>;

export const ProfitabilitySchema = z.object({
  periodDays: z.number().int(),
  stats: ProfitabilityStatsSchema,
  trend: z.array(MarginTrendPointSchema),
  products: z.array(ProductMarginRowSchema),
});
export type ProfitabilityDTO = z.infer<typeof ProfitabilitySchema>;

// Kept as aliases so Stock Health code reads naturally; the status set is
// shared with the Dashboard via src/features/stock/stock-status.ts.
export const StockHealthStatusSchema = StockStatusSchema;
export type StockHealthStatus = StockStatusValue;

export const StockHealthRowSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  productSku: z.string(),
  quantityCartons: z.string(),
  thresholdCartons: z.string().nullable(),
  status: StockStatusSchema,
  averageDailySalesCartons: z.string(),
  daysOfCover: z.string().nullable(),
});
export type StockHealthRowDTO = z.infer<typeof StockHealthRowSchema>;

export type StockHealthBucketDTO = StockStatusBucketDTO;

export const StockHealthSchema = z.object({
  windowDays: z.number().int(),
  distribution: z.array(StockStatusBucketSchema),
  rows: z.array(StockHealthRowSchema),
});
export type StockHealthDTO = z.infer<typeof StockHealthSchema>;

export const BestSellerRowSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  productSku: z.string(),
  categoryName: z.string(),
  unitsSoldCartons: z.string(),
  revenue: z.string(),
  priorUnitsSoldCartons: z.string(),
  priorRevenue: z.string(),
});
export type BestSellerRowDTO = z.infer<typeof BestSellerRowSchema>;

export const BestSellersSchema = z.object({
  periodDays: z.number().int(),
  byQuantity: z.array(BestSellerRowSchema),
  byRevenue: z.array(BestSellerRowSchema),
});
export type BestSellersDTO = z.infer<typeof BestSellersSchema>;
