import { z } from "zod";
import {
  CategorySchema,
  ToCategoryDTO,
} from "@/features/categories/validators/category.schema";
import type { Category, Cost, Price, Product } from "@/generated/prisma/client";
import { CartonsString, PerCarton } from "@/lib/carton-decimal";
import { ListQuerySchema } from "@/lib/list-query";
import { CARTON_SIZES } from "@/lib/packing";

export const CartonSizeSchema = z.enum(CARTON_SIZES);

export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string(),
  isActive: z.boolean(),
  categoryId: z.string(),
  category: CategorySchema,
  // Normal (7 kg) or Plus (8.5 kg) — see src/lib/packing.ts.
  cartonSize: CartonSizeSchema,
  // Active price/cost per carton (stored per kg, converted here). Null =
  // not set. `currentCost` is also null when the caller lacks
  // product:cost (see ../cost-access.ts).
  currentPrice: z.string().nullable(),
  currentCost: z.string().nullable(),
  // Low-stock alert level in cartons. Null means no alert is ever raised
  // for this product — opt-in per product, not a global default. See
  // docs/DECISIONS.md.
  lowStockThresholdCartons: z.string().nullable(),
  // True once stock has ever moved — the carton size is then fixed.
  hasStockHistory: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type ProductDTO = z.infer<typeof ProductSchema>;

export const ProductListResponseSchema = z.array(ProductSchema);

export const CreateProductInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(160),
  categoryId: z.string().min(1, "Category is required"),
  cartonSize: CartonSizeSchema.default("NORMAL"),
});

export type CreateProductInput = z.input<typeof CreateProductInputSchema>;

export const UpdateProductInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(160).optional(),
  categoryId: z.string().min(1, "Category is required").optional(),
  isActive: z.boolean().optional(),
  // Rejected once the product has stock history.
  cartonSize: CartonSizeSchema.optional(),
  // Explicit null clears the threshold (no alert); a number sets it;
  // omitted leaves it unchanged.
  lowStockThresholdCartons: z
    .union([z.coerce.number().positive().finite(), z.null()])
    .optional(),
});

export type UpdateProductInput = z.infer<typeof UpdateProductInputSchema>;

type ProductWithRelations = Product & {
  category: Category;
  prices: Pick<Price, "amountPerKg">[];
  costs: Pick<Cost, "amountPerKg">[];
  _count: { stockLedgerEntries: number };
};

// `showCost` is CanSeeCost(session permissions). Required, so no route can
// forget it and leak cost to the Inventory Manager.
export function ToProductDTO(
  product: ProductWithRelations,
  showCost: boolean,
): ProductDTO {
  const size = product.cartonSize;
  const price = product.prices[0]?.amountPerKg;
  const cost = showCost ? product.costs[0]?.amountPerKg : undefined;
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    isActive: product.isActive,
    categoryId: product.categoryId,
    category: ToCategoryDTO(product.category),
    cartonSize: size,
    currentPrice: price ? PerCarton(price, size) : null,
    currentCost: cost ? PerCarton(cost, size) : null,
    lowStockThresholdCartons: product.lowStockThresholdKg
      ? CartonsString(product.lowStockThresholdKg, size)
      : null,
    hasStockHistory: product._count.stockLedgerEntries > 0,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

// The active-price/cost include shared by every query that needs
// `currentPrice`/`currentCost` — keep this in sync with ToProductDTO.
export const ACTIVE_PRICE_INCLUDE = {
  category: true,
  prices: {
    where: { effectiveTo: null },
    take: 1,
    select: { amountPerKg: true },
  },
  costs: {
    where: { effectiveTo: null },
    take: 1,
    select: { amountPerKg: true },
  },
  _count: { select: { stockLedgerEntries: true } },
} as const;

export const PRODUCT_SORT_KEYS = ["name", "sku", "createdAt"] as const;

// Searches name and SKU.
export const ProductQuerySchema = ListQuerySchema(PRODUCT_SORT_KEYS, "name");
export type ProductQuery = z.input<typeof ProductQuerySchema>;
