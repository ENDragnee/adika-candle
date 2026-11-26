import { Prisma } from "@/generated/prisma/client";
import { ApplyMaterialDelta } from "@/lib/ledger-balance";
import { WAX_MATERIAL_NAME } from "@/lib/packing";
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

type Tx = Prisma.TransactionClient;

// The material production draws from. Every carton is almost all wax (the
// wick is negligible), so accepting N cartons consumes N × kg-per-carton
// of it — see src/lib/packing.ts. Matched by name (WAX_MATERIAL_NAME); created
// on first use so production never fails for want of a catalog row.

export async function FindWaxMaterial(tx: Tx | typeof prisma) {
  const existing = await tx.rawMaterial.findFirst({
    where: { name: { equals: WAX_MATERIAL_NAME, mode: "insensitive" } },
  });
  return (
    existing ?? tx.rawMaterial.create({ data: { name: WAX_MATERIAL_NAME } })
  );
}

// Written by AcceptStock inside its own transaction. Never blocked by a
// low or negative wax balance (matching Stock) — the Dashboard flags a
// negative balance, and a wax count shows any gap as under-production
// in Analytics → Production.
export async function ConsumeWaxForProduction(
  tx: Tx,
  input: { quantityKg: Prisma.Decimal; note: string; createdById: string },
) {
  const wax = await FindWaxMaterial(tx);
  const balanceAfterKg = await ApplyMaterialDelta(
    tx,
    wax.id,
    input.quantityKg.negated(),
  );
  return tx.rawMaterialLedgerEntry.create({
    data: {
      materialId: wax.id,
      type: "CONSUMED",
      quantityKg: input.quantityKg,
      balanceAfterKg,
      note: input.note,
      createdById: input.createdById,
    },
  });
}

// Raw material arriving at the factory. Consumption is never entered by
// hand — it follows from accepted production (ConsumeWaxForProduction).
// quantityKg is stored as a positive magnitude.
export async function RecordMaterialReceipt(input: {
  materialId: string;
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
  const delta = magnitude;

  return prisma.$transaction(async (tx) => {
    const balanceAfterKg = await ApplyMaterialDelta(
      tx,
      input.materialId,
      delta,
    );
    return tx.rawMaterialLedgerEntry.create({
      data: {
        materialId: input.materialId,
        type: "RECEIVED",
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
