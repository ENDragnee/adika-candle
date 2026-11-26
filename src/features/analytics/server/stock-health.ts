import {
  ClassifyStock,
  STOCK_STATUSES,
  type StockStatus,
} from "@/features/stock/stock-status";
import { TrailingWindowStart } from "@/lib/business-time";
import { KgToCartons } from "@/lib/packing";
import { prisma } from "@/lib/prisma";

export const STOCK_VELOCITY_WINDOW_DAYS = 30;

// All quantities in cartons of the product (stored kg ÷ kg per carton).
export interface StockHealthInputRow {
  productId: string;
  productName: string;
  productSku: string;
  quantityCartons: number;
  thresholdCartons: number | null;
  soldCartons: number; // net of voids, over the velocity window
}

export function ComputeStockHealth(
  rows: StockHealthInputRow[],
  windowDays = STOCK_VELOCITY_WINDOW_DAYS,
) {
  const result = rows.map((row) => {
    const status = ClassifyStock(row.quantityCartons, row.thresholdCartons);
    const averageDailySalesCartons = row.soldCartons / windowDays;
    // Days of cover only means something when there's stock to cover with
    // and sales to cover. Before Epic 21 a negative balance produced
    // "-5.0 days".
    const daysOfCover =
      row.quantityCartons > 0 && averageDailySalesCartons > 0
        ? (row.quantityCartons / averageDailySalesCartons).toFixed(1)
        : null;

    return {
      productId: row.productId,
      productName: row.productName,
      productSku: row.productSku,
      quantityCartons: String(row.quantityCartons),
      thresholdCartons:
        row.thresholdCartons === null ? null : String(row.thresholdCartons),
      status,
      averageDailySalesCartons: averageDailySalesCartons.toFixed(3),
      daysOfCover,
    };
  });

  const distribution = STOCK_STATUSES.map((status: StockStatus) => ({
    status,
    count: result.filter((row) => row.status === status).length,
  }));

  return { windowDays, distribution, rows: result };
}

export async function LoadStockHealthInput(now = new Date()) {
  const windowStart = TrailingWindowStart(now, STOCK_VELOCITY_WINDOW_DAYS);
  const [products, sold] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      include: { stockBalance: true },
      orderBy: { name: "asc" },
    }),
    prisma.sale.groupBy({
      by: ["productId"],
      where: { createdAt: { gte: windowStart }, voidedAt: null },
      _sum: { quantityKg: true },
    }),
  ]);
  const soldKgByProduct = new Map(
    sold.map((row) => [row.productId, Number(row._sum.quantityKg ?? 0)]),
  );

  return products.map((product) => {
    const Cartons = (kg: number) => KgToCartons(kg, product.cartonSize);
    return {
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      quantityCartons: Cartons(Number(product.stockBalance?.quantityKg ?? 0)),
      thresholdCartons:
        product.lowStockThresholdKg === null
          ? null
          : Cartons(Number(product.lowStockThresholdKg)),
      soldCartons: Cartons(soldKgByProduct.get(product.id) ?? 0),
    };
  });
}

export async function BuildStockHealth(now = new Date()) {
  return ComputeStockHealth(await LoadStockHealthInput(now));
}
