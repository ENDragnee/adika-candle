import type { Prisma } from "@/generated/prisma/client";
import { AddBusinessDays, TrailingWindowStart } from "@/lib/business-time";
import { prisma } from "@/lib/prisma";
import { ZERO } from "./decimal";

export const DEFAULT_BEST_SELLERS_WINDOW_DAYS = 7;
const BEST_SELLERS_LIMIT = 10;

// Current window = the last `days` local calendar days (today inclusive),
// prior window = the `days` before that — the same midnight-aligned
// windows every other report uses. Before Epic 21 this was a rolling
// `now − days` window, so its edges moved through the day.
export async function BuildBestSellers(days: number, now = new Date()) {
  const currentStart = TrailingWindowStart(now, days);
  const priorStart = AddBusinessDays(currentStart, -days);

  const sales = await prisma.sale.findMany({
    where: { createdAt: { gte: priorStart }, voidedAt: null },
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
