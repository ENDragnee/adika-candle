import { AssertPeriodOpen } from "@/features/system/server/period-lock";
import { Prisma } from "@/generated/prisma/client";
import { ApplyLoanDelta, ApplyStockDelta } from "@/lib/ledger-balance";
import { prisma } from "@/lib/prisma";
import { DomainError } from "@/lib/server/domain-error";
import { WITH_SALE_RELATIONS_INCLUDE } from "../validators/sale.schema";

// Voids a sale (Epic 21). Never deletes: the Sale row stays for the audit
// trail with voidedAt/voidedById/voidReason set, and its effects are
// reversed by new ledger entries in the same transaction —
//   - stock: a SALE_VOID entry returning the sold kg,
//   - loans: a SALE_VOID transaction undoing whatever the sale posted
//     (SALE_ON_CREDIT and/or ADVANCE_REDEEMED; both raised the balance).
// Every analytics query filters `voidedAt: null`. To correct a sale,
// void it and record the right one. See docs/DECISIONS.md.
export async function VoidSale(
  saleId: string,
  reason: string,
  voidedById: string,
) {
  return prisma.$transaction(async (tx) => {
    // Row lock so two people can't void the same sale twice.
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
    if (sale.voidedAt) {
      throw new DomainError(
        "This sale is already voided",
        409,
        "ALREADY_VOIDED",
      );
    }
    // Epic 24: a closed period's sales stay as they are.
    await AssertPeriodOpen(sale.createdAt, "void");

    const now = new Date();
    await tx.sale.update({
      where: { id: saleId },
      data: { voidedAt: now, voidedById, voidReason: reason },
    });

    const note = `Voided sale ${sale.referenceCode}: ${reason}`;
    const balanceAfterKg = await ApplyStockDelta(
      tx,
      sale.productId,
      sale.quantityKg,
    );
    await tx.stockLedgerEntry.create({
      data: {
        productId: sale.productId,
        type: "SALE_VOID",
        quantityKg: sale.quantityKg,
        balanceAfterKg,
        inputQuantity: sale.inputQuantity,
        inputUnitName: sale.inputUnitName,
        inputRatioToKg: sale.inputRatioToKg,
        note,
        saleId,
        createdById: voidedById,
      },
    });

    const posted = sale.loanTransactions
      .filter(
        (transaction) =>
          transaction.type === "SALE_ON_CREDIT" ||
          transaction.type === "ADVANCE_REDEEMED",
      )
      .reduce(
        (sum, transaction) => sum.plus(transaction.amount),
        new Prisma.Decimal(0),
      );

    if (posted.greaterThan(0)) {
      const loanAccountId = sale.loanTransactions[0].loanAccountId;
      const balanceAfter = await ApplyLoanDelta(
        tx,
        loanAccountId,
        posted.negated(),
      );
      await tx.loanTransaction.create({
        data: {
          loanAccountId,
          type: "SALE_VOID",
          amount: posted,
          balanceAfter,
          note,
          saleId,
          createdById: voidedById,
        },
      });
    }

    return tx.sale.findUniqueOrThrow({
      where: { id: saleId },
      include: WITH_SALE_RELATIONS_INCLUDE,
    });
  });
}
