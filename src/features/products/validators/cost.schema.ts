import { z } from "zod";
import type { Cost } from "@/generated/prisma/client";

export const CostSchema = z.object({
  id: z.string(),
  productId: z.string(),
  amountPerKg: z.string(),
  effectiveFrom: z.iso.datetime(),
  effectiveTo: z.iso.datetime().nullable(),
  createdById: z.string(),
  createdAt: z.iso.datetime(),
});

export type CostDTO = z.infer<typeof CostSchema>;

export const CostListResponseSchema = z.array(CostSchema);

export const SetNewCostInputSchema = z.object({
  amountPerKg: z.coerce.number().positive().finite(),
});

export type SetNewCostInput = z.infer<typeof SetNewCostInputSchema>;

export function ToCostDTO(cost: Cost): CostDTO {
  return {
    id: cost.id,
    productId: cost.productId,
    amountPerKg: cost.amountPerKg.toString(),
    effectiveFrom: cost.effectiveFrom.toISOString(),
    effectiveTo: cost.effectiveTo ? cost.effectiveTo.toISOString() : null,
    createdById: cost.createdById,
    createdAt: cost.createdAt.toISOString(),
  };
}
