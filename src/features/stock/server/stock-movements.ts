import { ConsumeWaxForProduction } from "@/features/raw-materials/server/material-movements";
import { Prisma } from "@/generated/prisma/client";
import { KgFromCartons } from "@/lib/carton-decimal";
import { ApplyStockDelta } from "@/lib/ledger-balance";
import { KG_PER_CARTON } from "@/lib/packing";
import { prisma } from "@/lib/prisma";
import { DomainError } from "@/lib/server/domain-error";
import { WITH_CARTON_SIZE_INCLUDE } from "../validators/stock.schema";

// Stock counts (Epic 21). The ledger records the *difference* between
// the count and the recorded balance as a signed ADJUSTMENT, so the
// ledger keeps summing to the balance. The balance row is locked while
// the difference is computed, so a sale landing mid-count can't make the
// adjustment overshoot. Counted in cartons (packets and pieces arrive as
// carton fractions), stored in kg like every other stock figure.
export async function RecordStockCount(input: {
  productId: string;
  countedCartons: number;
  reason: string;
  createdById: string;
}) {
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
  });
  if (!product) throw new DomainError("Product not found", 404, "NOT_FOUND");
  const countedKg = KgFromCartons(
    new Prisma.Decimal(input.countedCartons),
    product.cartonSize,
  );

  return prisma.$transaction(async (tx) => {
    await tx.stockBalance.upsert({
      where: { productId: input.productId },
      create: { productId: input.productId, quantityKg: 0 },
      update: {},
    });
    await tx.$queryRaw`
      SELECT id FROM stock_balance WHERE "productId" = ${input.productId} FOR UPDATE
    `;
    const current = await tx.stockBalance.findUniqueOrThrow({
      where: { productId: input.productId },
    });
    const delta = countedKg.minus(current.quantityKg);
    const balanceAfterKg = await ApplyStockDelta(tx, input.productId, delta);

    return tx.stockLedgerEntry.create({
      data: {
        productId: input.productId,
        type: "ADJUSTMENT",
        quantityKg: delta,
        balanceAfterKg,
        note: input.reason,
        createdById: input.createdById,
      },
      include: WITH_CARTON_SIZE_INCLUDE,
    });
  });
}

// Inbound stock from production (Epic 4), in cartons. The wax that went
// into it (cartons × kg per carton) is taken off the Wax balance in the
// same transaction, so nobody records raw-material use by hand.
export async function AcceptStock(input: {
  productId: string;
  cartons: number;
  note?: string;
  createdById: string;
}) {
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
  });
  if (!product) throw new DomainError("Product not found", 404, "NOT_FOUND");
  if (!product.isActive) {
    throw new DomainError(
      "This product is inactive — reactivate it before accepting stock",
      400,
      "PRODUCT_INACTIVE",
    );
  }

  const cartons = new Prisma.Decimal(input.cartons);
  const quantityKg = KgFromCartons(cartons, product.cartonSize);
  return prisma.$transaction(async (tx) => {
    const balanceAfterKg = await ApplyStockDelta(
      tx,
      input.productId,
      quantityKg,
    );
    const entry = await tx.stockLedgerEntry.create({
      data: {
        productId: input.productId,
        type: "ACCEPT",
        quantityKg,
        balanceAfterKg,
        inputQuantity: cartons,
        inputUnitName: "CARTON",
        inputRatioToKg: KG_PER_CARTON[product.cartonSize],
        note: input.note,
        createdById: input.createdById,
      },
      include: WITH_CARTON_SIZE_INCLUDE,
    });
    await ConsumeWaxForProduction(tx, {
      quantityKg,
      note: `Made ${cartons.toString()} ctn of ${product.name}`,
      createdById: input.createdById,
    });
    return entry;
  });
}
