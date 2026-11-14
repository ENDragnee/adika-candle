import { AssertPeriodOpen } from "@/features/system/server/period-lock";
import { Prisma } from "@/generated/prisma/client";
import { ApplyLoanDelta, ApplyStockDelta } from "@/lib/ledger-balance";
import { prisma } from "@/lib/prisma";
import { DomainError } from "@/lib/server/domain-error";
import { WITH_SALE_RELATIONS_INCLUDE } from "../validators/sale.schema";

// Restores a voided sale (Epic 24) — the exact mirror of VoidSale: new
// ledger entries re-apply what the void reversed, in one transaction:
//   - stock: a SALE_RESTORE entry taking the sold kg again (refused, like
//     a new sale, when that much isn't on hand),
//   - loans: a SALE_RESTORE transaction re-posting what the void took off.
// The void's reason and who did it stay in the activity log; the sale row
// itself becomes active again.
export async function RestoreSale(
  saleId: string,
  reason: string,
  restoredById: string,
) {
  return prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM sale WHERE id = ${saleId} FOR UPDATE
    `;
    if (locked.length === 0) {
      throw new DomainError("Sale not found", 404, "NOT_FOUND");
    }

    const sale = await tx.sale.findUniqueOrThrow({
      where: { id: saleId },
      include: { loanTransactions: true },
    });
    if (!sale.voidedAt) {
      throw new DomainError("This sale isn't voided", 409, "NOT_VOIDED");
    }
    await AssertPeriodOpen(sale.createdAt, "restore");

    const balance = await tx.stockBalance.findUnique({
      where: { productId: sale.productId },
    });
    const available = balance?.quantityKg ?? new Prisma.Decimal(0);
    if (available.lessThan(sale.quantityKg)) {
      throw new DomainError(
        "Not enough stock on hand to restore this sale. Accept stock first, or leave it voided.",
        409,
        "INSUFFICIENT_STOCK",
        {
          availableKg: available.toString(),
          requestedKg: sale.quantityKg.toString(),
        },
      );
    }

    await tx.sale.update({
      where: { id: saleId },
      data: { voidedAt: null, voidedById: null, voidReason: null },
    });

    const note = `Restored sale ${sale.referenceCode}: ${reason}`;
    const balanceAfterKg = await ApplyStockDelta(
      tx,
      sale.productId,
      sale.quantityKg.negated(),
    );
    await tx.stockLedgerEntry.create({
      data: {
        productId: sale.productId,
        type: "SALE_RESTORE",
        quantityKg: sale.quantityKg.negated(),
        balanceAfterKg,
        inputQuantity: sale.inputQuantity,
        inputUnitName: sale.inputUnitName,
        inputRatioToKg: sale.inputRatioToKg,
        note,
        saleId,
        createdById: restoredById,
      },
    });

    // What the void took off, net of any earlier restore/void cycles:
    // voids minus restores so far.
    const net = sale.loanTransactions.reduce((sum, transaction) => {
      if (transaction.type === "SALE_VOID") return sum.plus(transaction.amount);
      if (transaction.type === "SALE_RESTORE") {
        return sum.minus(transaction.amount);
      }
      return sum;
    }, new Prisma.Decimal(0));

    if (net.greaterThan(0)) {
      const loanAccountId = sale.loanTransactions[0].loanAccountId;
      const balanceAfter = await ApplyLoanDelta(tx, loanAccountId, net);
      await tx.loanTransaction.create({
        data: {
          loanAccountId,
          type: "SALE_RESTORE",
          amount: net,
          balanceAfter,
          note,
          saleId,
          createdById: restoredById,
        },
      });
    }

    return tx.sale.findUniqueOrThrow({
      where: { id: saleId },
      include: WITH_SALE_RELATIONS_INCLUDE,
    });
  });
}
