// One definition of "how healthy is this product's stock", shared by the
// Dashboard's attention list, Analytics → Stock Health, the stock lists
// and the product detail summary — before Epic 21 the Dashboard and Stock
// Health each had their own rule and disagreed on the same data. Plain
// numbers, not Decimals: these are kg comparisons, never money, and the
// helper has to run in client components too. See docs/DECISIONS.md,
// "Epic 21 decisions".

export const STOCK_STATUSES = [
  "NEGATIVE",
  "OUT_OF_STOCK",
  "CRITICAL",
  "LOW",
  "HEALTHY",
  "OVERSTOCKED",
  "UNTRACKED",
] as const;

export type StockStatus = (typeof STOCK_STATUSES)[number];

// Multipliers against Product.lowStockThresholdKg. Carried over unchanged
// from Epic 17 (docs/DECISIONS.md, "Epic 17 decisions").
export const CRITICAL_RATIO = 0.5;
export const OVERSTOCKED_RATIO = 3;

export function ClassifyStock(
  quantityKg: number,
  thresholdKg: number | null,
): StockStatus {
  // A negative balance means more was sold than was ever recorded as
  // accepted — always a data problem to fix with a stock count, never a
  // normal "empty" state.
  if (quantityKg < 0) return "NEGATIVE";
  if (quantityKg === 0) return "OUT_OF_STOCK";
  // No threshold configured: we can say it's in stock, but not whether
  // that's low or plenty. Reported honestly as "not tracked" rather than
  // assumed healthy.
  if (thresholdKg === null || thresholdKg <= 0) return "UNTRACKED";
  if (quantityKg < thresholdKg * CRITICAL_RATIO) return "CRITICAL";
  if (quantityKg < thresholdKg) return "LOW";
  if (quantityKg <= thresholdKg * OVERSTOCKED_RATIO) return "HEALTHY";
  return "OVERSTOCKED";
}

// Statuses that put a product on the Dashboard's "Needs attention" list.
export const ATTENTION_STOCK_STATUSES: readonly StockStatus[] = [
  "NEGATIVE",
  "OUT_OF_STOCK",
  "CRITICAL",
  "LOW",
];

export function NeedsStockAttention(status: StockStatus): boolean {
  return ATTENTION_STOCK_STATUSES.includes(status);
}
