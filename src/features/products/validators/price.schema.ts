import { z } from "zod";
import type { Price } from "@/generated/prisma/client";

export const PriceSchema = z.object({
  id: z.string(),
  productId: z.string(),
  amountPerKg: z.string(),
  effectiveFrom: z.iso.datetime(),
  effectiveTo: z.iso.datetime().nullable(),
  createdById: z.string(),
  createdAt: z.iso.datetime(),
});

export type PriceDTO = z.infer<typeof PriceSchema>;

export const PriceListResponseSchema = z.array(PriceSchema);

export const SetNewPriceInputSchema = z.object({
  amountPerKg: z.coerce.number().positive().finite(),
});

export type SetNewPriceInput = z.infer<typeof SetNewPriceInputSchema>;

export function ToPriceDTO(price: Price): PriceDTO {
  return {
    id: price.id,
    productId: price.productId,
    amountPerKg: price.amountPerKg.toString(),
    effectiveFrom: price.effectiveFrom.toISOString(),
    effectiveTo: price.effectiveTo ? price.effectiveTo.toISOString() : null,
    createdById: price.createdById,
    createdAt: price.createdAt.toISOString(),
  };
}
