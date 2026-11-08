import {
  StockLedgerEntryListResponseSchema,
  ToStockLedgerEntryDTO,
} from "@/features/stock/validators/stock.schema";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import { prisma } from "@/lib/prisma";

type Params = { productId: string };

export const GET = CreateApiRoute<unknown, Params>({
  moduleName: "stock.ledger",
  requiresAuth: { status: true, permission: "stock:read" },
  responseSchema: StockLedgerEntryListResponseSchema,
  handler: async (_body, _session, params) => {
    const entries = await prisma.stockLedgerEntry.findMany({
      where: { productId: params?.productId },
      orderBy: { createdAt: "desc" },
    });
    return entries.map(ToStockLedgerEntryDTO);
  },
});
