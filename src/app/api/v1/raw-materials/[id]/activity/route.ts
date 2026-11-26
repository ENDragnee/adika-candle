import { RecordMaterialReceipt } from "@/features/raw-materials/server/material-movements";
import type { RecordMaterialActivityInput } from "@/features/raw-materials/validators/raw-material.schema";
import {
  RawMaterialLedgerEntrySchema,
  RecordMaterialActivityInputSchema,
  ToRawMaterialLedgerEntryDTO,
} from "@/features/raw-materials/validators/raw-material.schema";
import { MaterialName } from "@/lib/activity/names";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";

type Params = { id: string };

export const POST = CreateApiRoute<RecordMaterialActivityInput, Params>({
  moduleName: "raw-materials.activity",
  schema: RecordMaterialActivityInputSchema,
  requiresAuth: {
    status: true,
    permission: ["raw-material:record", "raw-material:manage"],
  },
  responseSchema: RawMaterialLedgerEntrySchema,
  activity: async ({ body, result, params }) => {
    const name = await MaterialName(params?.id);
    return {
      type: "materials",
      action: "material.receive",
      message: `Received ${body.quantityKg} kg of ${name}`,
      entityType: "material",
      entityId: params?.id,
      entityLabel: name,
      changes: {
        quantityKg: body.quantityKg,
        balanceAfterKg: result.balanceAfterKg,
        note: body.note,
      },
    };
  },
  handler: async (body, session, params) => {
    const entry = await RecordMaterialReceipt({
      materialId: params?.id ?? "",
      quantityKg: body.quantityKg,
      note: body.note,
      createdById: session?.id ?? "",
    });
    return ToRawMaterialLedgerEntryDTO(entry);
  },
});
