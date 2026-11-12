import { RecordMaterialActivity } from "@/features/raw-materials/server/material-movements";
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
      action:
        body.type === "RECEIVED" ? "material.receive" : "material.consume",
      message: `${body.type === "RECEIVED" ? "Received" : "Used"} ${body.quantityKg} kg of ${name}`,
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
    const entry = await RecordMaterialActivity({
      materialId: params?.id ?? "",
      type: body.type,
      quantityKg: body.quantityKg,
      note: body.note,
      createdById: session?.id ?? "",
    });
    return ToRawMaterialLedgerEntryDTO(entry);
  },
});
