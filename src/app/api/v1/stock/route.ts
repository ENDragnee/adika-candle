import {
  StockBalanceListResponseSchema,
  StockBalanceQuerySchema,
  ToStockBalanceDTO,
} from "@/features/stock/validators/stock.schema";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import { prisma } from "@/lib/prisma";

export const GET = CreateApiRoute({
  moduleName: "stock",
  schema: StockBalanceQuerySchema,
  requiresAuth: { status: true, permission: "stock:read" },
  responseSchema: StockBalanceListResponseSchema,
  handler: async (query) => {
    const products = await prisma.product.findMany({
      where: query.productId ? { id: query.productId } : undefined,
      include: { stockBalance: true },
      orderBy: { name: "asc" },
    });
    return products.map(ToStockBalanceDTO);
  },
});
