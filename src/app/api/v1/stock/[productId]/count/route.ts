import { RecordStockCount } from "@/features/stock/server/stock-movements";
import {
  StockLedgerEntrySchema,
  ToStockLedgerEntryDTO,
} from "@/features/stock/validators/stock.schema";
import { ProductName } from "@/lib/activity/names";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import {
  type ProductStockCountInput,
  ProductStockCountInputSchema,
} from "@/lib/schemas/stock-count.schema";

type Params = { productId: string };

export const POST = CreateApiRoute<ProductStockCountInput, Params>({
  moduleName: "stock.count",
  schema: ProductStockCountInputSchema,
  requiresAuth: { status: true, permission: "stock:adjust" },
  responseSchema: StockLedgerEntrySchema,
  activity: async ({ body, result, params }) => {
    const name = await ProductName(params?.productId);
    return {
      type: "stock",
      action: "stock.count",
      message: `Recorded a stock count of ${body.countedCartons} ctn for ${name} (${Number(result.quantityCartons) >= 0 ? "+" : ""}${result.quantityCartons} ctn)`,
      severity: "WARN",
      entityType: "product",
      entityId: params?.productId,
      entityLabel: name,
      changes: {
        countedCartons: body.countedCartons,
        correctionCartons: result.quantityCartons,
        reason: body.reason,
      },
    };
  },
  handler: async (body, session, params) => {
    const entry = await RecordStockCount({
      productId: params?.productId ?? "",
      countedCartons: body.countedCartons,
      reason: body.reason,
      createdById: session?.id ?? "",
    });
    return ToStockLedgerEntryDTO(entry);
  },
});
