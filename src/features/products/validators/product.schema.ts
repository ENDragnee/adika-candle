import { z } from "zod";
import {
  CategorySchema,
  ToCategoryDTO,
} from "@/features/categories/validators/category.schema";
import type { Category, Price, Product } from "@/generated/prisma/client";
import { ListQuerySchema } from "@/lib/list-query";

export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string(),
  isActive: z.boolean(),
  categoryId: z.string(),
  category: CategorySchema,
  currentPrice: z.string().nullable(),
  // Null means no low-stock alert is ever raised for this product — opt-in
  // per product, not a global default. See docs/DECISIONS.md.
  lowStockThresholdKg: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type ProductDTO = z.infer<typeof ProductSchema>;

export const ProductListResponseSchema = z.array(ProductSchema);

export const CreateProductInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(160),
  categoryId: z.string().min(1, "Category is required"),
});

export type CreateProductInput = z.infer<typeof CreateProductInputSchema>;

export const UpdateProductInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(160).optional(),
  categoryId: z.string().min(1, "Category is required").optional(),
  isActive: z.boolean().optional(),
  // Explicit null clears the threshold (no alert); a number sets it;
  // omitted leaves it unchanged.
  lowStockThresholdKg: z
    .union([z.coerce.number().positive().finite(), z.null()])
    .optional(),
});

export type UpdateProductInput = z.infer<typeof UpdateProductInputSchema>;

type ProductWithRelations = Product & {
  category: Category;
  prices: Pick<Price, "amountPerKg">[];
};

export function ToProductDTO(product: ProductWithRelations): ProductDTO {
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    isActive: product.isActive,
    categoryId: product.categoryId,
    category: ToCategoryDTO(product.category),
    currentPrice: product.prices[0]?.amountPerKg.toString() ?? null,
    lowStockThresholdKg: product.lowStockThresholdKg?.toString() ?? null,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

// The active-price include shared by every query that needs `currentPrice`
// — keep this in sync with ToProductDTO's expectations.
export const ACTIVE_PRICE_INCLUDE = {
  category: true,
  prices: {
    where: { effectiveTo: null },
    take: 1,
    select: { amountPerKg: true },
  },
} as const;

export const PRODUCT_SORT_KEYS = ["name", "sku", "createdAt"] as const;

// Searches name and SKU.
export const ProductQuerySchema = ListQuerySchema(PRODUCT_SORT_KEYS, "name");
export type ProductQuery = z.input<typeof ProductQuerySchema>;
