import { prisma } from "@/lib/prisma";

// Logical backup (Epic 24): every business table as JSON, taken through
// Prisma because pg_dump isn't available to the app (hosted Postgres).
// Never included: password hashes (Account), session tokens (Session) and
// verification rows. Decimals serialize as exact strings, dates as ISO.
// There is deliberately no restore-from-file in the UI; a restore is an
// operator task (see docs/epics/24-admin-controls.md).

export const BACKUP_FORMAT = "adika-candle-backup";
export const BACKUP_VERSION = 1;

export async function BuildBackup({
  includeLogs,
  createdBy,
}: {
  includeLogs: boolean;
  createdBy: string;
}) {
  // One snapshot: a repeatable-read transaction sees every table as of
  // the same moment, so balances and ledgers agree with each other.
  const tables = await prisma.$transaction(
    async (tx) => ({
      users: await tx.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          displayUsername: true,
          isActive: true,
          roleId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      modules: await tx.module.findMany(),
      permissions: await tx.permission.findMany(),
      roles: await tx.role.findMany({
        include: { permissions: { select: { name: true } } },
      }),
      categories: await tx.category.findMany(),
      products: await tx.product.findMany(),
      prices: await tx.price.findMany(),
      costs: await tx.cost.findMany(),
      unitConversions: await tx.unitConversion.findMany(),
      stockBalances: await tx.stockBalance.findMany(),
      stockLedgerEntries: await tx.stockLedgerEntry.findMany(),
      rawMaterials: await tx.rawMaterial.findMany(),
      rawMaterialBalances: await tx.rawMaterialBalance.findMany(),
      rawMaterialLedgerEntries: await tx.rawMaterialLedgerEntry.findMany(),
      productMaterialRequirements:
        await tx.productMaterialRequirement.findMany(),
      customers: await tx.customer.findMany(),
      loanAccounts: await tx.loanAccount.findMany(),
      loanTransactions: await tx.loanTransaction.findMany(),
      sales: await tx.sale.findMany(),
      systemSettings: await tx.systemSetting.findMany(),
      ...(includeLogs && { logs: await tx.log.findMany() }),
    }),
    { isolationLevel: "RepeatableRead", timeout: 60_000 },
  );

  const counts = Object.fromEntries(
    Object.entries(tables).map(([name, rows]) => [name, rows.length]),
  );
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    createdBy,
    counts,
    tables,
  };
}
