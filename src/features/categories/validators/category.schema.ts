import { z } from "zod";
import type { Category } from "@/generated/prisma/client";

export const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type CategoryDTO = z.infer<typeof CategorySchema>;

export const CategoryListResponseSchema = z.array(CategorySchema);

export const CreateCategoryInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  description: z.string().trim().max(500).optional(),
});

export type CreateCategoryInput = z.infer<typeof CreateCategoryInputSchema>;

export const UpdateCategoryInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120).optional(),
  description: z.string().trim().max(500).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateCategoryInput = z.infer<typeof UpdateCategoryInputSchema>;

export function ToCategoryDTO(category: Category): CategoryDTO {
  return {
    id: category.id,
    name: category.name,
    description: category.description,
    isActive: category.isActive,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}
