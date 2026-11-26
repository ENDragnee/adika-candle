import { z } from "zod";
import type {
  Product,
  StockBalance,
  StockLedgerEntry,
} from "@/generated/prisma/client";
import { CartonsString } from "@/lib/carton-decimal";
import { ListQuerySchema } from "@/lib/list-query";

export const StockBalanceSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  productSku: z.string(),
  cartonSize: z.enum(["NORMAL", "PLUS"]),
  quantityKg: z.string(),
  // What people read: remaining stock in cartons (split into packets and
  // pieces on screen by src/lib/packing.ts).
  quantityCartons: z.string(),
  // The product's low-stock alert level, so lists can show the shared
  // stock status (src/features/stock/stock-status.ts) next to the number.
  thresholdCartons: z.string().nullable(),
  isActive: z.boolean(),
  // null means this product has never had a StockBalance row created —
  // i.e. stock has never been accepted for it.
  updatedAt: z.iso.datetime().nullable(),
});

export type StockBalanceDTO = z.infer<typeof StockBalanceSchema>;

export const StockBalanceListResponseSchema = z.array(StockBalanceSchema);

type ProductWithStockBalance = Product & { stockBalance: StockBalance | null };

export function ToStockBalanceDTO(
  product: ProductWithStockBalance,
): StockBalanceDTO {
  const quantityKg = product.stockBalance?.quantityKg;
  return {
    productId: product.id,
    productName: product.name,
    productSku: product.sku,
    cartonSize: product.cartonSize,
    quantityKg: (quantityKg ?? 0).toString(),
    quantityCartons: quantityKg
      ? CartonsString(quantityKg, product.cartonSize)
      : "0",
    thresholdCartons: product.lowStockThresholdKg
      ? CartonsString(product.lowStockThresholdKg, product.cartonSize)
      : null,
    isActive: product.isActive,
    updatedAt: product.stockBalance?.updatedAt.toISOString() ?? null,
  };
}

export const StockEntryTypeSchema = z.enum([
  "ACCEPT",
  "SALE",
  "ADJUSTMENT",
  "SALE_VOID",
  "SALE_RESTORE",
]);

export const StockLedgerEntrySchema = z.object({
  id: z.string(),
  productId: z.string(),
  type: StockEntryTypeSchema,
  quantityKg: z.string(),
  balanceAfterKg: z.string(),
  // The same two figures in cartons.
  quantityCartons: z.string(),
  balanceAfterCartons: z.string(),
  inputQuantity: z.string().nullable(),
  inputUnitName: z.string().nullable(),
  inputRatioToKg: z.string().nullable(),
  note: z.string().nullable(),
  saleId: z.string().nullable(),
  createdById: z.string(),
  createdByName: z.string().nullable(),
  createdAt: z.iso.datetime(),
});

export type StockLedgerEntryDTO = z.infer<typeof StockLedgerEntrySchema>;

export const StockLedgerEntryListResponseSchema = z.array(
  StockLedgerEntrySchema,
);

export type StockLedgerEntryWithSize = StockLedgerEntry & {
  product: Pick<Product, "cartonSize">;
};

// Include for ledger queries, so ToStockLedgerEntryDTO can convert to cartons.
export const WITH_CARTON_SIZE_INCLUDE = {
  product: { select: { cartonSize: true } },
} as const;

export function ToStockLedgerEntryDTO(
  entry: StockLedgerEntryWithSize,
  createdByName: string | null = null,
): StockLedgerEntryDTO {
  return {
    id: entry.id,
    productId: entry.productId,
    type: entry.type,
    quantityKg: entry.quantityKg.toString(),
    balanceAfterKg: entry.balanceAfterKg.toString(),
    quantityCartons: CartonsString(entry.quantityKg, entry.product.cartonSize),
    balanceAfterCartons: CartonsString(
      entry.balanceAfterKg,
      entry.product.cartonSize,
    ),
    inputQuantity: entry.inputQuantity?.toString() ?? null,
    inputUnitName: entry.inputUnitName,
    inputRatioToKg: entry.inputRatioToKg?.toString() ?? null,
    note: entry.note,
    saleId: entry.saleId,
    createdById: entry.createdById,
    createdByName,
    createdAt: entry.createdAt.toISOString(),
  };
}

// Stock comes in from production in cartons only.
export const AcceptStockInputSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  cartons: z.coerce.number().positive().finite(),
  note: z.string().trim().max(500).optional(),
});

export type AcceptStockInput = z.infer<typeof AcceptStockInputSchema>;

export const STOCK_SORT_KEYS = ["name", "quantity"] as const;

export const StockBalanceQuerySchema = ListQuerySchema(
  STOCK_SORT_KEYS,
  "name",
).extend({
  productId: z.string().optional(),
});

export type StockBalanceQuery = z.input<typeof StockBalanceQuerySchema>;

// Inventory dashboard (no money): what's left and today's movement, all
// in cartons. Totals add cartons across products — a Plus carton and a
// Normal carton each count as one.
export const StockSummarySchema = z.object({
  remainingCartons: z.string(),
  productCount: z.number().int(),
  lowOrOutCount: z.number().int(),
  producedTodayCartons: z.string(),
  soldTodayCartons: z.string(),
});

export type StockSummaryDTO = z.infer<typeof StockSummarySchema>;
