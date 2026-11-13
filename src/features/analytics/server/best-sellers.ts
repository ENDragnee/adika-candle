import type { Prisma } from "@/generated/prisma/client";
import { AddBusinessDays, StartOfBusinessDate } from "@/lib/business-time";
import { prisma } from "@/lib/prisma";
import { ZERO } from "./decimal";

export const DEFAULT_BEST_SELLERS_WINDOW_DAYS = 7;
const BEST_SELLERS_LIMIT = 10;

// Windows are midnight-aligned local calendar days, like every other
// report. Before Epic 21 this was a rolling `now − days` window, so its
// edges moved through the day.
// Epic 22: any from/to range; "prior" is the same number of days
// immediately before it.
export async function BuildBestSellers(range: { from: string; to: string }) {
  const currentStart = StartOfBusinessDate(range.from);
  const currentEnd = AddBusinessDays(StartOfBusinessDate(range.to), 1);
  const days = Math.round(
    (currentEnd.getTime() - currentStart.getTime()) / 86_400_000,
  );
  const priorStart = AddBusinessDays(currentStart, -days);

  const sales = await prisma.sale.findMany({
    where: {
      createdAt: { gte: priorStart, lt: currentEnd },
      voidedAt: null,
    },
    include: { product: { include: { category: true } } },
  });

  interface Bucket {
    productName: string;
    productSku: string;
    categoryName: string;
    unitsSoldKg: Prisma.Decimal;
    revenue: Prisma.Decimal;
  }
  const current = new Map<string, Bucket>();
  const prior = new Map<string, Bucket>();

  for (const sale of sales) {
    const target = sale.createdAt >= currentStart ? current : prior;
    const bucket = target.get(sale.productId) ?? {
      productName: sale.product.name,
      productSku: sale.product.sku,
      categoryName: sale.product.category.name,
      unitsSoldKg: ZERO,
      revenue: ZERO,
    };
    bucket.unitsSoldKg = bucket.unitsSoldKg.plus(sale.quantityKg);
    bucket.revenue = bucket.revenue.plus(sale.totalAmount);
    target.set(sale.productId, bucket);
  }

  const rows = [...current.entries()].map(([productId, bucket]) => ({
    productId,
    bucket,
    priorBucket: prior.get(productId),
  }));

  const ToRow = ({
    productId,
    bucket,
    priorBucket,
  }: (typeof rows)[number]) => ({
    productId,
    productName: bucket.productName,
    productSku: bucket.productSku,
    categoryName: bucket.categoryName,
    unitsSoldKg: bucket.unitsSoldKg.toString(),
    revenue: bucket.revenue.toString(),
    priorUnitsSoldKg: priorBucket?.unitsSoldKg.toString() ?? "0",
    priorRevenue: priorBucket?.revenue.toString() ?? "0",
  });

  return {
    periodDays: days,
    byQuantity: [...rows]
      .sort((a, b) => b.bucket.unitsSoldKg.comparedTo(a.bucket.unitsSoldKg))
      .slice(0, BEST_SELLERS_LIMIT)
      .map(ToRow),
    byRevenue: [...rows]
      .sort((a, b) => b.bucket.revenue.comparedTo(a.bucket.revenue))
      .slice(0, BEST_SELLERS_LIMIT)
      .map(ToRow),
  };
}
