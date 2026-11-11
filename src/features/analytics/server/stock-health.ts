import {
  ClassifyStock,
  STOCK_STATUSES,
  type StockStatus,
} from "@/features/stock/stock-status";
import { TrailingWindowStart } from "@/lib/business-time";
import { prisma } from "@/lib/prisma";

export const STOCK_VELOCITY_WINDOW_DAYS = 30;

export interface StockHealthInputRow {
  productId: string;
  productName: string;
  productSku: string;
  quantityKg: number;
  thresholdKg: number | null;
  soldKg: number; // net of voids, over the velocity window
}

export function ComputeStockHealth(
  rows: StockHealthInputRow[],
  windowDays = STOCK_VELOCITY_WINDOW_DAYS,
) {
  const result = rows.map((row) => {
    const status = ClassifyStock(row.quantityKg, row.thresholdKg);
    const averageDailySalesKg = row.soldKg / windowDays;
    // Days of cover only means something when there's stock to cover with
    // and sales to cover. Before Epic 21 a negative balance produced
    // "-5.0 days".
    const daysOfCover =
      row.quantityKg > 0 && averageDailySalesKg > 0
        ? (row.quantityKg / averageDailySalesKg).toFixed(1)
        : null;

    return {
      productId: row.productId,
      productName: row.productName,
      productSku: row.productSku,
      quantityKg: String(row.quantityKg),
      thresholdKg: row.thresholdKg === null ? null : String(row.thresholdKg),
      status,
      averageDailySalesKg: averageDailySalesKg.toFixed(3),
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
  const soldByProduct = new Map(
    sold.map((row) => [row.productId, Number(row._sum.quantityKg ?? 0)]),
  );

  return products.map((product) => ({
    productId: product.id,
    productName: product.name,
    productSku: product.sku,
    quantityKg: Number(product.stockBalance?.quantityKg ?? 0),
    thresholdKg:
      product.lowStockThresholdKg === null
        ? null
        : Number(product.lowStockThresholdKg),
    soldKg: soldByProduct.get(product.id) ?? 0,
  }));
}

export async function BuildStockHealth(now = new Date()) {
  return ComputeStockHealth(await LoadStockHealthInput(now));
}
