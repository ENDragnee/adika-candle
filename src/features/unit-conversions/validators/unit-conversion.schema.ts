import { z } from "zod";
import type { UnitConversion } from "@/generated/prisma/client";

export const UnitConversionSchema = z.object({
  id: z.string(),
  unitName: z.string(),
  ratioToKg: z.string(),
  isActive: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type UnitConversionDTO = z.infer<typeof UnitConversionSchema>;

export const UnitConversionListResponseSchema = z.array(UnitConversionSchema);

export const CreateUnitConversionInputSchema = z.object({
  unitName: z
    .string()
    .trim()
    .min(1, "Unit name is required")
    .max(60)
    .transform((value) => value.toUpperCase()),
  ratioToKg: z.coerce.number().positive().finite(),
});

export type CreateUnitConversionInput = z.infer<
  typeof CreateUnitConversionInputSchema
>;

export const UpdateUnitConversionInputSchema = z.object({
  ratioToKg: z.coerce.number().positive().finite().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateUnitConversionInput = z.infer<
  typeof UpdateUnitConversionInputSchema
>;

export function ToUnitConversionDTO(unit: UnitConversion): UnitConversionDTO {
  return {
    id: unit.id,
    unitName: unit.unitName,
    ratioToKg: unit.ratioToKg.toString(),
    isActive: unit.isActive,
    createdAt: unit.createdAt.toISOString(),
    updatedAt: unit.updatedAt.toISOString(),
  };
}
