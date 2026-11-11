import { NextResponse } from "next/server";
import type { RecordMaterialActivityInput } from "@/features/raw-materials/validators/raw-material.schema";
import {
  RawMaterialLedgerEntrySchema,
  RecordMaterialActivityInputSchema,
  ToRawMaterialLedgerEntryDTO,
} from "@/features/raw-materials/validators/raw-material.schema";
import { Prisma } from "@/generated/prisma/client";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import { prisma } from "@/lib/prisma";

type Params = { id: string };

export const POST = CreateApiRoute<RecordMaterialActivityInput, Params>({
  moduleName: "raw-materials.activity",
  schema: RecordMaterialActivityInputSchema,
  requiresAuth: {
    status: true,
    permission: ["raw-material:record", "raw-material:manage"],
  },
  responseSchema: RawMaterialLedgerEntrySchema,
  handler: async (body, session, params) => {
    const materialId = params?.id;

    if (!materialId) {
      return NextResponse.json(
        { error: "Raw material not found" },
        { status: 404 },
      );
    }

    const material = await prisma.rawMaterial.findUnique({
      where: { id: materialId },
    });

    if (!material) {
      return NextResponse.json(
        { error: "Raw material not found" },
        { status: 404 },
      );
    }

    // requiresAuth.status guarantees a session with an id by the time the
    // handler runs — see CreateApiRoute's 401 check.
    const createdById = session?.id;

    if (!createdById) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // RECEIVED increases the balance, CONSUMED decreases it — direction is
    // implied by type, same convention as StockEntryType. No guard against
    // consuming more than is on hand, matching Stock's own "no guard
    // against overselling" decision — the ledger stays the source of truth
    // even if the balance goes negative.
    const delta = new Prisma.Decimal(body.quantityKg).times(
      body.type === "RECEIVED" ? 1 : -1,
    );

    const ledgerEntry = await prisma.$transaction(async (tx) => {
      const existingBalance = await tx.rawMaterialBalance.findUnique({
        where: { materialId },
      });
      const balanceAfterKg = (
        existingBalance?.quantityKg ?? new Prisma.Decimal(0)
      ).plus(delta);

      await tx.rawMaterialBalance.upsert({
        where: { materialId },
        create: { materialId, quantityKg: balanceAfterKg },
        update: { quantityKg: balanceAfterKg },
      });

      return tx.rawMaterialLedgerEntry.create({
        data: {
          materialId,
          type: body.type,
          quantityKg: body.quantityKg,
          balanceAfterKg,
          note: body.note,
          createdById,
        },
      });
    });

    return ToRawMaterialLedgerEntryDTO(ledgerEntry);
  },
});
