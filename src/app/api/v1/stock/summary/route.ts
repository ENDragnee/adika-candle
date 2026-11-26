import {
  ClassifyStock,
  NeedsStockAttention,
} from "@/features/stock/stock-status";
import { StockSummarySchema } from "@/features/stock/validators/stock.schema";
import { Prisma } from "@/generated/prisma/client";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import { StartOfBusinessDay } from "@/lib/business-time";
import { CartonsFromKg } from "@/lib/carton-decimal";
import { prisma } from "@/lib/prisma";

const ZERO = new Prisma.Decimal(0);

export const GET = CreateApiRoute({
  moduleName: "stock.summary",
  requiresAuth: { status: true, permission: "stock:read" },
  responseSchema: StockSummarySchema,
  handler: async () => {
    const todayStart = StartOfBusinessDay(new Date());
    const [products, today] = await Promise.all([
      prisma.product.findMany({
        where: { isActive: true },
        include: { stockBalance: true },
      }),
      prisma.stockLedgerEntry.groupBy({
        by: ["productId", "type"],
        where: { createdAt: { gte: todayStart } },
        _sum: { quantityKg: true },
      }),
    ]);
    const sizeOf = new Map(products.map((p) => [p.id, p.cartonSize]));
    let remaining = ZERO;
    let lowOrOutCount = 0;
    for (const product of products) {
      const cartons = CartonsFromKg(
        product.stockBalance?.quantityKg ?? ZERO,
        product.cartonSize,
      );
      remaining = remaining.plus(cartons);
      const threshold = product.lowStockThresholdKg
        ? CartonsFromKg(product.lowStockThresholdKg, product.cartonSize)
        : null;
      if (
        NeedsStockAttention(
          ClassifyStock(cartons.toNumber(), threshold?.toNumber() ?? null),
        )
      ) {
        lowOrOutCount++;
      }
    }

    // Sold = SALE net of same-day voids/restores; SALE rows are negative.
    let produced = ZERO;
    let sold = ZERO;
    for (const row of today) {
      const size = sizeOf.get(row.productId);
      if (!size) continue;
      const cartons = CartonsFromKg(row._sum.quantityKg ?? ZERO, size);
      if (row.type === "ACCEPT") produced = produced.plus(cartons);
      if (
        row.type === "SALE" ||
        row.type === "SALE_VOID" ||
        row.type === "SALE_RESTORE"
      ) {
        sold = sold.minus(cartons);
      }
    }

    return {
      remainingCartons: remaining.toString(),
      productCount: products.length,
      lowOrOutCount,
      producedTodayCartons: produced.toString(),
      soldTodayCartons: sold.toString(),
    };
  },
});
