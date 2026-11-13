import type { Prisma } from "@/generated/prisma/client";
import { BusinessDateKey } from "@/lib/business-time";
import { prisma } from "@/lib/prisma";
import { MarginPercent, ZERO } from "./decimal";
import { BuildDailyWindow } from "./periods";

export const DEFAULT_PROFITABILITY_WINDOW_DAYS = 30;

export interface ProfitSale {
  createdAt: Date;
  productId: string;
  productName: string;
  productSku: string;
  quantityKg: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  costPerKgAtSale: Prisma.Decimal | null;
}

interface Bucket {
  revenue: Prisma.Decimal;
  // Revenue from sales that had a cost snapshot — the only revenue profit
  // and margin may be computed against.
  costedRevenue: Prisma.Decimal;
  cost: Prisma.Decimal;
}

function EmptyBucket(): Bucket {
  return { revenue: ZERO, costedRevenue: ZERO, cost: ZERO };
}

function AddSale(bucket: Bucket, sale: ProfitSale) {
  bucket.revenue = bucket.revenue.plus(sale.totalAmount);
  if (sale.costPerKgAtSale !== null) {
    bucket.costedRevenue = bucket.costedRevenue.plus(sale.totalAmount);
    bucket.cost = bucket.cost.plus(sale.costPerKgAtSale.times(sale.quantityKg));
  }
}

// Profit = costed revenue − cost. Sales recorded while their product had
// no cost set have *unknown* profit, so they're left out of profit and
// margin entirely (but still count toward revenue). Before Epic 21 they
// were left out of cost only, which reported them as 100% profit. See
// docs/DECISIONS.md, "Epic 21 decisions".
function ProfitOf(bucket: Bucket): string | null {
  return bucket.costedRevenue.greaterThan(0)
    ? bucket.costedRevenue.minus(bucket.cost).toString()
    : null;
}

export function ComputeProfitability(input: {
  sales: ProfitSale[];
  now: Date;
  days: number;
  currentPrices: Map<string, Prisma.Decimal>;
  currentCosts: Map<string, Prisma.Decimal>;
}) {
  const { sales, now, days, currentPrices, currentCosts } = input;
  const total = EmptyBucket();
  const byDay = new Map<string, Bucket>();
  const byProduct = new Map<
    string,
    Bucket & {
      productName: string;
      productSku: string;
      unitsSoldKg: Prisma.Decimal;
      uncostedSaleCount: number;
    }
  >();
  let includedSaleCount = 0;
  let excludedSaleCount = 0;

  for (const sale of sales) {
    AddSale(total, sale);

    const dayKey = BusinessDateKey(sale.createdAt);
    const day = byDay.get(dayKey) ?? EmptyBucket();
    AddSale(day, sale);
    byDay.set(dayKey, day);

    const product = byProduct.get(sale.productId) ?? {
      ...EmptyBucket(),
      productName: sale.productName,
      productSku: sale.productSku,
      unitsSoldKg: ZERO,
      uncostedSaleCount: 0,
    };
    AddSale(product, sale);
    product.unitsSoldKg = product.unitsSoldKg.plus(sale.quantityKg);
    byProduct.set(sale.productId, product);

    if (sale.costPerKgAtSale === null) {
      excludedSaleCount += 1;
      product.uncostedSaleCount += 1;
    } else {
      includedSaleCount += 1;
    }
  }

  const trend = BuildDailyWindow(now, days).map((period) => {
    const bucket = byDay.get(period.key) ?? EmptyBucket();
    return {
      date: period.key,
      revenue: bucket.revenue.toString(),
      profit: ProfitOf(bucket),
      marginPercent: MarginPercent(bucket.costedRevenue, bucket.cost),
    };
  });

  const products = [...byProduct.entries()]
    .sort(([, a], [, b]) => b.revenue.comparedTo(a.revenue))
    .map(([productId, bucket]) => {
      const price = currentPrices.get(productId) ?? null;
      const cost = currentCosts.get(productId) ?? null;
      return {
        productId,
        productName: bucket.productName,
        productSku: bucket.productSku,
        currentPricePerKg: price?.toString() ?? null,
        currentCostPerKg: cost?.toString() ?? null,
        // What the margin would be on a sale made today.
        currentMarginPercent: price && cost ? MarginPercent(price, cost) : null,
        // What the margin actually was on this window's costed sales.
        realizedMarginPercent: MarginPercent(bucket.costedRevenue, bucket.cost),
        unitsSoldKg: bucket.unitsSoldKg.toString(),
        revenue: bucket.revenue.toString(),
        totalProfit: ProfitOf(bucket),
        uncostedSaleCount: bucket.uncostedSaleCount,
      };
    });

  return {
    periodDays: days,
    stats: {
      totalRevenue: total.revenue.toString(),
      costedRevenue: total.costedRevenue.toString(),
      totalCost: total.cost.toString(),
      totalProfit: ProfitOf(total),
      averageMarginPercent: MarginPercent(total.costedRevenue, total.cost),
      includedSaleCount,
      excludedSaleCount,
    },
    trend,
    products,
  };
}

export async function BuildProfitability(days: number, now = new Date()) {
  const windowStart = BuildDailyWindow(now, days)[0].start;
  const sales = await prisma.sale.findMany({
    where: { createdAt: { gte: windowStart }, voidedAt: null },
    include: { product: true },
  });

  const productIds = [...new Set(sales.map((sale) => sale.productId))];
  const [activePrices, activeCosts] = await Promise.all([
    prisma.price.findMany({
      where: { productId: { in: productIds }, effectiveTo: null },
    }),
    prisma.cost.findMany({
      where: { productId: { in: productIds }, effectiveTo: null },
    }),
  ]);

  return ComputeProfitability({
    now,
    days,
    sales: sales.map((sale) => ({
      createdAt: sale.createdAt,
      productId: sale.productId,
      productName: sale.product.name,
      productSku: sale.product.sku,
      quantityKg: sale.quantityKg,
      totalAmount: sale.totalAmount,
      costPerKgAtSale: sale.costPerKgAtSale,
    })),
    currentPrices: new Map(
      activePrices.map((p) => [p.productId, p.amountPerKg]),
    ),
    currentCosts: new Map(activeCosts.map((c) => [c.productId, c.amountPerKg])),
  });
}
