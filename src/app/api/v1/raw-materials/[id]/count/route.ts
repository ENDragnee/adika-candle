import { RecordMaterialCount } from "@/features/raw-materials/server/material-movements";
import {
  RawMaterialLedgerEntrySchema,
  ToRawMaterialLedgerEntryDTO,
} from "@/features/raw-materials/validators/raw-material.schema";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import {
  type StockCountInput,
  StockCountInputSchema,
} from "@/lib/schemas/stock-count.schema";

type Params = { id: string };

export const POST = CreateApiRoute<StockCountInput, Params>({
  moduleName: "raw-materials.count",
  schema: StockCountInputSchema,
  requiresAuth: { status: true, permission: "stock:adjust" },
  responseSchema: RawMaterialLedgerEntrySchema,
  handler: async (body, session, params) => {
    const entry = await RecordMaterialCount({
      materialId: params?.id ?? "",
      countedKg: body.countedKg,
      reason: body.reason,
      createdById: session?.id ?? "",
    });
    return ToRawMaterialLedgerEntryDTO(entry);
  },
});
