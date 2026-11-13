import {
  RawMaterialBalanceQuerySchema,
  RawMaterialBalanceSchema,
  ToRawMaterialBalanceDTO,
} from "@/features/raw-materials/validators/raw-material.schema";
import type { Prisma } from "@/generated/prisma/client";
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
    const where: Prisma.RawMaterialWhereInput = {
      ...(query.materialId && { id: query.materialId }),
      ...(query.search && {
        name: { contains: query.search, mode: "insensitive" },
      }),
    };
    const orderBy: Prisma.RawMaterialOrderByWithRelationInput[] =
      query.sort === "quantity"
        ? [{ balance: { quantityKg: query.dir } }, { name: "asc" }]
        : [{ name: query.dir }];

    const [materials, total] = await Promise.all([
      prisma.rawMaterial.findMany({
        where,
        include: { balance: true },
        orderBy,
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
