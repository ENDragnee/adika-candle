import { AcceptStock } from "@/features/stock/server/stock-movements";
import {
  AcceptStockInputSchema,
  StockLedgerEntrySchema,
  ToStockLedgerEntryDTO,
} from "@/features/stock/validators/stock.schema";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";

export const POST = CreateApiRoute({
  moduleName: "stock.accept",
  schema: AcceptStockInputSchema,
  requiresAuth: { status: true, permission: "stock:accept" },
  responseSchema: StockLedgerEntrySchema,
  handler: async (body, session) => {
    const entry = await AcceptStock({
      productId: body.productId,
      quantity: body.quantity,
      unitName: body.unitName,
      note: body.note,
      createdById: session?.id ?? "",
    });
    return ToStockLedgerEntryDTO(entry);
  },
});
