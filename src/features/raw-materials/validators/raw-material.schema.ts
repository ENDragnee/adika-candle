import { z } from "zod";
import type {
  RawMaterial,
  RawMaterialBalance,
  RawMaterialLedgerEntry,
} from "@/generated/prisma/client";
import { ListQuerySchema } from "@/lib/list-query";

export const RawMaterialSchema = z.object({
  id: z.string(),
  name: z.string(),
  isActive: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type RawMaterialDTO = z.infer<typeof RawMaterialSchema>;

export const RawMaterialListResponseSchema = z.array(RawMaterialSchema);

export const CreateRawMaterialInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
});

export type CreateRawMaterialInput = z.infer<
  typeof CreateRawMaterialInputSchema
>;

export const UpdateRawMaterialInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateRawMaterialInput = z.infer<
  typeof UpdateRawMaterialInputSchema
>;

export function ToRawMaterialDTO(material: RawMaterial): RawMaterialDTO {
  return {
    id: material.id,
    name: material.name,
    isActive: material.isActive,
    createdAt: material.createdAt.toISOString(),
    updatedAt: material.updatedAt.toISOString(),
  };
}

export const RawMaterialBalanceSchema = z.object({
  materialId: z.string(),
  materialName: z.string(),
  quantityKg: z.string(),
  // null means this material has never had a balance row created — i.e. no
  // activity has ever been recorded for it.
  updatedAt: z.iso.datetime().nullable(),
});

export type RawMaterialBalanceDTO = z.infer<typeof RawMaterialBalanceSchema>;

export const RawMaterialBalanceListResponseSchema = z.array(
  RawMaterialBalanceSchema,
);

export const MATERIAL_SORT_KEYS = ["name", "quantity"] as const;

export const RawMaterialBalanceQuerySchema = ListQuerySchema(
  MATERIAL_SORT_KEYS,
  "name",
).extend({
  materialId: z.string().optional(),
});

export type RawMaterialBalanceQuery = z.input<
  typeof RawMaterialBalanceQuerySchema
>;

type RawMaterialWithBalance = RawMaterial & {
  balance: RawMaterialBalance | null;
};

export function ToRawMaterialBalanceDTO(
  material: RawMaterialWithBalance,
): RawMaterialBalanceDTO {
  return {
    materialId: material.id,
    materialName: material.name,
    quantityKg: (material.balance?.quantityKg ?? 0).toString(),
    updatedAt: material.balance?.updatedAt.toISOString() ?? null,
  };
}

export const RawMaterialEntryTypeSchema = z.enum([
  "RECEIVED",
  "CONSUMED",
  "ADJUSTMENT",
]);

export const RawMaterialLedgerEntrySchema = z.object({
  id: z.string(),
  materialId: z.string(),
  type: RawMaterialEntryTypeSchema,
  quantityKg: z.string(),
  balanceAfterKg: z.string(),
  note: z.string().nullable(),
  createdById: z.string(),
  createdAt: z.iso.datetime(),
});

export type RawMaterialLedgerEntryDTO = z.infer<
  typeof RawMaterialLedgerEntrySchema
>;

export const RawMaterialLedgerEntryListResponseSchema = z.array(
  RawMaterialLedgerEntrySchema,
);

export function ToRawMaterialLedgerEntryDTO(
  entry: RawMaterialLedgerEntry,
): RawMaterialLedgerEntryDTO {
  return {
    id: entry.id,
    materialId: entry.materialId,
    type: entry.type,
    quantityKg: entry.quantityKg.toString(),
    balanceAfterKg: entry.balanceAfterKg.toString(),
    note: entry.note,
    createdById: entry.createdById,
    createdAt: entry.createdAt.toISOString(),
  };
}

// RECEIVED/CONSUMED only. Corrections (ADJUSTMENT) go through the separate
// stock-count endpoint (POST /api/v1/raw-materials/[id]/count, Epic 21),
// which needs the stricter stock:adjust permission.
export const RecordMaterialActivityInputSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("RECEIVED"),
    quantityKg: z.coerce.number().positive().finite(),
    note: z.string().trim().max(500).optional(),
  }),
  z.object({
    type: z.literal("CONSUMED"),
    quantityKg: z.coerce.number().positive().finite(),
    note: z.string().trim().max(500).optional(),
  }),
]);

export type RecordMaterialActivityInput = z.infer<
  typeof RecordMaterialActivityInputSchema
>;
