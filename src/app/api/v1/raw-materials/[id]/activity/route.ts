import { RecordMaterialActivity } from "@/features/raw-materials/server/material-movements";
import type { RecordMaterialActivityInput } from "@/features/raw-materials/validators/raw-material.schema";
import {
  RawMaterialLedgerEntrySchema,
  RecordMaterialActivityInputSchema,
  ToRawMaterialLedgerEntryDTO,
} from "@/features/raw-materials/validators/raw-material.schema";
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
