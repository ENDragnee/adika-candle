import { AcceptStock } from "@/features/stock/server/stock-movements";
import {
  AcceptStockInputSchema,
  StockLedgerEntrySchema,
  ToStockLedgerEntryDTO,
} from "@/features/stock/validators/stock.schema";
import { ProductName } from "@/lib/activity/names";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";

export const POST = CreateApiRoute({
  moduleName: "stock.accept",
  schema: AcceptStockInputSchema,
  requiresAuth: { status: true, permission: "stock:accept" },
  responseSchema: StockLedgerEntrySchema,
  activity: async ({ body, result }) => {
    const name = await ProductName(body.productId);
    return {
      type: "stock",
      action: "stock.accept",
      message: `Accepted ${body.quantity} ${body.unitName} (${result.quantityKg} kg) of ${name}`,
      entityType: "product",
      entityId: body.productId,
      entityLabel: name,
      changes: {
        quantity: body.quantity,
        unit: body.unitName,
        quantityKg: result.quantityKg,
        note: body.note,
      },
    };
  },
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
