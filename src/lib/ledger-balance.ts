import type { Prisma } from "@/generated/prisma/client";

// Atomic cached-balance updates for the three "cached balance +
// append-only ledger" pairs (stock, raw materials, loans — see
// docs/DECISIONS.md, "Stock and loan balances: cached column + append-only
// ledger").
//
// Before Epic 21 every write path did read → compute → `update({ value:
// computed })` inside `$transaction`. Postgres' default READ COMMITTED
// isolation lets two concurrent transactions both read 100 and both write
// 90, silently losing one movement. An `increment` compiles to
// `SET col = col + delta`, which takes the row lock and re-reads the
// latest committed value, so concurrent writers serialize correctly, and
// the returned row carries the true post-write balance to snapshot into
// the ledger's `balanceAfter`. Always call these inside the same
// `$transaction` as the ledger insert.

type Tx = Prisma.TransactionClient;

export async function ApplyStockDelta(
  tx: Tx,
  productId: string,
  deltaKg: Prisma.Decimal,
): Promise<Prisma.Decimal> {
  const balance = await tx.stockBalance.upsert({
    where: { productId },
    create: { productId, quantityKg: deltaKg },
    update: { quantityKg: { increment: deltaKg } },
  });
  return balance.quantityKg;
}

export async function ApplyMaterialDelta(
  tx: Tx,
  materialId: string,
  deltaKg: Prisma.Decimal,
): Promise<Prisma.Decimal> {
  const balance = await tx.rawMaterialBalance.upsert({
    where: { materialId },
    create: { materialId, quantityKg: deltaKg },
    update: { quantityKg: { increment: deltaKg } },
  });
  return balance.quantityKg;
}

export async function ApplyLoanDelta(
  tx: Tx,
  loanAccountId: string,
  delta: Prisma.Decimal,
): Promise<Prisma.Decimal> {
  const account = await tx.loanAccount.update({
    where: { id: loanAccountId },
    data: { balance: { increment: delta } },
  });
  return account.balance;
}
