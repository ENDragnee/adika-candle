import {
  StockLedgerEntrySchema,
  ToStockLedgerEntryDTO,
} from "@/features/stock/validators/stock.schema";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import {
  BuildPaginationMeta,
  PaginatedResponseSchema,
  type PaginationQuery,
  PaginationQuerySchema,
  ToSkipTake,
} from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

type Params = { productId: string };

export const GET = CreateApiRoute<PaginationQuery, Params>({
  moduleName: "stock.ledger",
  schema: PaginationQuerySchema,
  requiresAuth: { status: true, permission: "stock:read" },
  responseSchema: PaginatedResponseSchema(StockLedgerEntrySchema),
  handler: async (query, _session, params) => {
    const where = { productId: params?.productId };

    const [entries, total] = await Promise.all([
      prisma.stockLedgerEntry.findMany({
        where,
        orderBy: { createdAt: "desc" },
        ...ToSkipTake(query),
      }),
      prisma.stockLedgerEntry.count({ where }),
    ]);
    return {
      data: entries.map(ToStockLedgerEntryDTO),
      pagination: BuildPaginationMeta(query, total),
    };
  },
});
