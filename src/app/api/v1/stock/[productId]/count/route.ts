import { RecordStockCount } from "@/features/stock/server/stock-movements";
import {
  StockLedgerEntrySchema,
  ToStockLedgerEntryDTO,
} from "@/features/stock/validators/stock.schema";
import { ProductName } from "@/lib/activity/names";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import {
  type StockCountInput,
  StockCountInputSchema,
} from "@/lib/schemas/stock-count.schema";

type Params = { productId: string };

export const POST = CreateApiRoute<StockCountInput, Params>({
  moduleName: "stock.count",
  schema: StockCountInputSchema,
  requiresAuth: { status: true, permission: "stock:adjust" },
  responseSchema: StockLedgerEntrySchema,
  activity: async ({ body, result, params }) => {
    const name = await ProductName(params?.productId);
    return {
      type: "stock",
      action: "stock.count",
      message: `Recorded a stock count of ${body.countedKg} kg for ${name} (${Number(result.quantityKg) >= 0 ? "+" : ""}${result.quantityKg} kg)`,
      severity: "WARN",
      entityType: "product",
      entityId: params?.productId,
      entityLabel: name,
      changes: {
        countedKg: body.countedKg,
        correctionKg: result.quantityKg,
        reason: body.reason,
      },
    };
  },
  handler: async (body, session, params) => {
    const entry = await RecordStockCount({
      productId: params?.productId ?? "",
      countedKg: body.countedKg,
      reason: body.reason,
      createdById: session?.id ?? "",
    });
    return ToStockLedgerEntryDTO(entry);
  },
});
