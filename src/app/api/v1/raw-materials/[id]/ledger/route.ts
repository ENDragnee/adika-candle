import {
  RawMaterialLedgerEntrySchema,
  ToRawMaterialLedgerEntryDTO,
} from "@/features/raw-materials/validators/raw-material.schema";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import {
  BuildPaginationMeta,
  PaginatedResponseSchema,
  type PaginationQuery,
  PaginationQuerySchema,
  ToSkipTake,
} from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

type Params = { id: string };

export const GET = CreateApiRoute<PaginationQuery, Params>({
  moduleName: "raw-materials.ledger",
  schema: PaginationQuerySchema,
  requiresAuth: {
    status: true,
    permission: ["raw-material:read", "raw-material:manage"],
  },
  responseSchema: PaginatedResponseSchema(RawMaterialLedgerEntrySchema),
  handler: async (query, _session, params) => {
    const where = { materialId: params?.id };

    const [entries, total] = await Promise.all([
      prisma.rawMaterialLedgerEntry.findMany({
        where,
        orderBy: { createdAt: "desc" },
        ...ToSkipTake(query),
      }),
      prisma.rawMaterialLedgerEntry.count({ where }),
    ]);
    return {
      data: entries.map(ToRawMaterialLedgerEntryDTO),
      pagination: BuildPaginationMeta(query, total),
    };
  },
});
