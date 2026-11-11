import {
  StockBalanceQuerySchema,
  StockBalanceSchema,
  ToStockBalanceDTO,
} from "@/features/stock/validators/stock.schema";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import {
  BuildPaginationMeta,
  PaginatedResponseSchema,
  PaginationQuerySchema,
  ToSkipTake,
} from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

const StockQuerySchema = StockBalanceQuerySchema.extend(
  PaginationQuerySchema.shape,
);

export const GET = CreateApiRoute({
  moduleName: "stock",
  schema: StockQuerySchema,
  requiresAuth: { status: true, permission: "stock:read" },
  responseSchema: PaginatedResponseSchema(StockBalanceSchema),
  handler: async (query) => {
    const where = query.productId ? { id: query.productId } : undefined;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { stockBalance: true },
        orderBy: { name: "asc" },
        ...ToSkipTake(query),
      }),
      prisma.product.count({ where }),
    ]);
    return {
      data: products.map(ToStockBalanceDTO),
      pagination: BuildPaginationMeta(query, total),
    };
  },
});
