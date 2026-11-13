import { RecordMaterialCount } from "@/features/raw-materials/server/material-movements";
import {
  RawMaterialLedgerEntrySchema,
  ToRawMaterialLedgerEntryDTO,
} from "@/features/raw-materials/validators/raw-material.schema";
import { MaterialName } from "@/lib/activity/names";
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
  activity: async ({ body, result, params }) => {
    const name = await MaterialName(params?.id);
    return {
      type: "materials",
      action: "material.count",
      message: `Recorded a stock count of ${body.countedKg} kg for ${name} (${Number(result.quantityKg) >= 0 ? "+" : ""}${result.quantityKg} kg)`,
      severity: "WARN",
      entityType: "material",
      entityId: params?.id,
      entityLabel: name,
      changes: {
        countedKg: body.countedKg,
        correctionKg: result.quantityKg,
        reason: body.reason,
      },
    };
  },
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
