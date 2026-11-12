import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { MarginPercent, ZERO } from "./decimal";
import { BuildRangeBuckets, type PeriodBounds } from "./periods";

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
  // Trend buckets covering the range, oldest first (BuildRangeBuckets).
  buckets: PeriodBounds[];
  currentPrices: Map<string, Prisma.Decimal>;
  currentCosts: Map<string, Prisma.Decimal>;
}) {
  const { sales, buckets, currentPrices, currentCosts } = input;
  const total = EmptyBucket();
  const byBucket = buckets.map(() => EmptyBucket());
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

    const bucketIndex = buckets.findIndex(
      (bucket) => sale.createdAt >= bucket.start && sale.createdAt < bucket.end,
    );
    if (bucketIndex >= 0) AddSale(byBucket[bucketIndex], sale);

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

  const trend = buckets.map((period, index) => {
    const bucket = byBucket[index];
    return {
      date: period.key,
      label: period.label,
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

  const first = buckets[0];
  const last = buckets[buckets.length - 1];
  return {
    periodDays:
      first && last
        ? Math.round((last.end.getTime() - first.start.getTime()) / 86_400_000)
        : 0,
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

export async function BuildProfitability(range: { from: string; to: string }) {
  const buckets = BuildRangeBuckets(range.from, range.to);
  const sales = await prisma.sale.findMany({
    where: {
      createdAt: { gte: buckets[0].start, lt: buckets[buckets.length - 1].end },
      voidedAt: null,
    },
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
    buckets,
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
