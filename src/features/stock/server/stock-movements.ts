import {
  convertToKg,
  UnknownUnitError,
} from "@/features/unit-conversions/services/convert-to-kg.service";
import { Prisma } from "@/generated/prisma/client";
import { ApplyStockDelta } from "@/lib/ledger-balance";
import { prisma } from "@/lib/prisma";
import { DomainError } from "@/lib/server/domain-error";

// Stock counts (Epic 21). The ledger records the *difference* between
// the count and the recorded balance as a signed ADJUSTMENT, so the
// ledger keeps summing to the balance. The balance row is locked while
// the difference is computed, so a sale landing mid-count can't make the
// adjustment overshoot.
export async function RecordStockCount(input: {
  productId: string;
  countedKg: number;
  reason: string;
  createdById: string;
}) {
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
  });
  if (!product) throw new DomainError("Product not found", 404, "NOT_FOUND");

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
    const delta = new Prisma.Decimal(input.countedKg).minus(current.quantityKg);
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
    });
  });
}

// Inbound stock from production (Epic 4), via the atomic balance helper.
export async function AcceptStock(input: {
  productId: string;
  quantity: number;
  unitName: string;
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

  let quantityKgNumber: number;
  try {
    quantityKgNumber = await convertToKg(input.unitName, input.quantity);
  } catch (err) {
    if (err instanceof UnknownUnitError) {
      throw new DomainError(err.message, 400, "UNKNOWN_UNIT");
    }
    throw err;
  }
  // Snapshot of the ratio that produced quantityKg — see docs/DECISIONS.md,
  // "Sale and StockLedgerEntry snapshot ratio/price at transaction time".
  const unit = await prisma.unitConversion.findUnique({
    where: { unitName: input.unitName },
  });
  if (!unit) {
    throw new DomainError(
      `Unknown or inactive unit: ${input.unitName}`,
      400,
      "UNKNOWN_UNIT",
    );
  }

  const quantityKg = new Prisma.Decimal(quantityKgNumber);
  return prisma.$transaction(async (tx) => {
    const balanceAfterKg = await ApplyStockDelta(
      tx,
      input.productId,
      quantityKg,
    );
    return tx.stockLedgerEntry.create({
      data: {
        productId: input.productId,
        type: "ACCEPT",
        quantityKg,
        balanceAfterKg,
        inputQuantity: input.quantity,
        inputUnitName: input.unitName,
        inputRatioToKg: unit.ratioToKg,
        note: input.note,
        createdById: input.createdById,
      },
    });
  });
}
