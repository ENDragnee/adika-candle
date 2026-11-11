import { z } from "zod";
import type {
  Product,
  StockBalance,
  StockLedgerEntry,
} from "@/generated/prisma/client";
import { ListQuerySchema } from "@/lib/list-query";

export const StockBalanceSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  productSku: z.string(),
  quantityKg: z.string(),
  // The product's low-stock alert level, so lists can show the shared
  // stock status (src/features/stock/stock-status.ts) next to the number.
  thresholdKg: z.string().nullable(),
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
  return {
    productId: product.id,
    productName: product.name,
    productSku: product.sku,
    quantityKg: (product.stockBalance?.quantityKg ?? 0).toString(),
    thresholdKg: product.lowStockThresholdKg?.toString() ?? null,
    isActive: product.isActive,
    updatedAt: product.stockBalance?.updatedAt.toISOString() ?? null,
  };
}

export const StockEntryTypeSchema = z.enum([
  "ACCEPT",
  "SALE",
  "ADJUSTMENT",
  "SALE_VOID",
]);

export const StockLedgerEntrySchema = z.object({
  id: z.string(),
  productId: z.string(),
  type: StockEntryTypeSchema,
  quantityKg: z.string(),
  balanceAfterKg: z.string(),
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

export function ToStockLedgerEntryDTO(
  entry: StockLedgerEntry,
  createdByName: string | null = null,
): StockLedgerEntryDTO {
  return {
    id: entry.id,
    productId: entry.productId,
    type: entry.type,
    quantityKg: entry.quantityKg.toString(),
    balanceAfterKg: entry.balanceAfterKg.toString(),
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

export const AcceptStockInputSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.coerce.number().positive().finite(),
  unitName: z.string().trim().min(1, "Unit is required"),
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
