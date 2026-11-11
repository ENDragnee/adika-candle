import { Prisma } from "@/generated/prisma/client";
import { ApplyMaterialDelta } from "@/lib/ledger-balance";
import { prisma } from "@/lib/prisma";
import { DomainError } from "@/lib/server/domain-error";

async function FindActiveMaterial(materialId: string) {
  const material = await prisma.rawMaterial.findUnique({
    where: { id: materialId },
  });
  if (!material) {
    throw new DomainError("Raw material not found", 404, "NOT_FOUND");
  }
  return material;
}

// RECEIVED increases the balance, CONSUMED decreases it; quantityKg is
// stored as a positive magnitude for both. No guard against consuming
// more than is on hand (matching Stock) — the Dashboard flags a negative
// balance and a stock count corrects it.
export async function RecordMaterialActivity(input: {
  materialId: string;
  type: "RECEIVED" | "CONSUMED";
  quantityKg: number;
  note?: string;
  createdById: string;
}) {
  const material = await FindActiveMaterial(input.materialId);
  if (!material.isActive) {
    throw new DomainError(
      "This raw material is inactive",
      400,
      "MATERIAL_INACTIVE",
    );
  }
  const magnitude = new Prisma.Decimal(input.quantityKg);
  const delta = input.type === "RECEIVED" ? magnitude : magnitude.negated();

  return prisma.$transaction(async (tx) => {
    const balanceAfterKg = await ApplyMaterialDelta(
      tx,
      input.materialId,
      delta,
    );
    return tx.rawMaterialLedgerEntry.create({
      data: {
        materialId: input.materialId,
        type: input.type,
        quantityKg: magnitude,
        balanceAfterKg,
        note: input.note,
        createdById: input.createdById,
      },
    });
  });
}

// Stock count for a raw material (Epic 21) — same approach as
// RecordStockCount. ADJUSTMENT is the one raw-material entry type whose
// quantityKg is stored *signed* (the difference applied), since it has no
// implied direction.
export async function RecordMaterialCount(input: {
  materialId: string;
  countedKg: number;
  reason: string;
  createdById: string;
}) {
  await FindActiveMaterial(input.materialId);

  return prisma.$transaction(async (tx) => {
    await tx.rawMaterialBalance.upsert({
      where: { materialId: input.materialId },
      create: { materialId: input.materialId, quantityKg: 0 },
      update: {},
    });
    await tx.$queryRaw`
      SELECT id FROM raw_material_balance WHERE "materialId" = ${input.materialId} FOR UPDATE
    `;
    const current = await tx.rawMaterialBalance.findUniqueOrThrow({
      where: { materialId: input.materialId },
    });
    const delta = new Prisma.Decimal(input.countedKg).minus(current.quantityKg);
    const balanceAfterKg = await ApplyMaterialDelta(
      tx,
      input.materialId,
      delta,
    );

    return tx.rawMaterialLedgerEntry.create({
      data: {
        materialId: input.materialId,
        type: "ADJUSTMENT",
        quantityKg: delta,
        balanceAfterKg,
        note: input.reason,
        createdById: input.createdById,
      },
    });
  });
}
