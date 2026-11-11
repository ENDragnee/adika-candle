import { RecordStockCount } from "@/features/stock/server/stock-movements";
import {
  StockLedgerEntrySchema,
  ToStockLedgerEntryDTO,
} from "@/features/stock/validators/stock.schema";
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
