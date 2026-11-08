import { z } from "zod";
import type { ProductMaterialRequirement } from "@/generated/prisma/client";

export const ProductMaterialRequirementSchema = z.object({
  id: z.string(),
  productId: z.string(),
  materialId: z.string(),
  materialName: z.string(),
  quantityKgPerOutputKg: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type ProductMaterialRequirementDTO = z.infer<
  typeof ProductMaterialRequirementSchema
>;

export const ProductMaterialRequirementListResponseSchema = z.array(
  ProductMaterialRequirementSchema,
);

export const CreateMaterialRequirementInputSchema = z.object({
  materialId: z.string().min(1, "Material is required"),
  quantityKgPerOutputKg: z.coerce.number().positive().finite(),
});

export type CreateMaterialRequirementInput = z.infer<
  typeof CreateMaterialRequirementInputSchema
>;

export const UpdateMaterialRequirementInputSchema = z.object({
  materialId: z.string().min(1, "Material is required"),
  quantityKgPerOutputKg: z.coerce.number().positive().finite(),
});

export type UpdateMaterialRequirementInput = z.infer<
  typeof UpdateMaterialRequirementInputSchema
>;

type RequirementWithMaterial = ProductMaterialRequirement & {
  material: { name: string };
};

export function ToProductMaterialRequirementDTO(
  requirement: RequirementWithMaterial,
): ProductMaterialRequirementDTO {
  return {
    id: requirement.id,
    productId: requirement.productId,
    materialId: requirement.materialId,
    materialName: requirement.material.name,
    quantityKgPerOutputKg: requirement.quantityKgPerOutputKg.toString(),
    createdAt: requirement.createdAt.toISOString(),
    updatedAt: requirement.updatedAt.toISOString(),
  };
}
