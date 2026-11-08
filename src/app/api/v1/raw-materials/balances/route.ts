import {
  RawMaterialBalanceQuerySchema,
  RawMaterialBalanceSchema,
  ToRawMaterialBalanceDTO,
} from "@/features/raw-materials/validators/raw-material.schema";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import {
  BuildPaginationMeta,
  PaginatedResponseSchema,
  PaginationQuerySchema,
  ToSkipTake,
} from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

const BalancesQuerySchema = RawMaterialBalanceQuerySchema.extend(
  PaginationQuerySchema.shape,
);

export const GET = CreateApiRoute({
  moduleName: "raw-materials.balances",
  schema: BalancesQuerySchema,
  requiresAuth: {
    status: true,
    permission: ["raw-material:read", "raw-material:manage"],
  },
  responseSchema: PaginatedResponseSchema(RawMaterialBalanceSchema),
  handler: async (query) => {
    const where = query.materialId ? { id: query.materialId } : undefined;

    const [materials, total] = await Promise.all([
      prisma.rawMaterial.findMany({
        where,
        include: { balance: true },
        orderBy: { name: "asc" },
        ...ToSkipTake(query),
      }),
      prisma.rawMaterial.count({ where }),
    ]);
    return {
      data: materials.map(ToRawMaterialBalanceDTO),
      pagination: BuildPaginationMeta(query, total),
    };
  },
});
