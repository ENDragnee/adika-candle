import { NextResponse } from "next/server";
import type { SetNewCostInput } from "@/features/products/validators/cost.schema";
import {
  CostSchema,
  SetNewCostInputSchema,
  ToCostDTO,
} from "@/features/products/validators/cost.schema";
import { ProductName } from "@/lib/activity/names";
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
  moduleName: "products.costs",
  schema: PaginationQuerySchema,
  requiresAuth: { status: true, permission: "product:manage" },
  responseSchema: PaginatedResponseSchema(CostSchema),
  handler: async (query, _session, params) => {
    const where = { productId: params?.id };

    const [costs, total] = await Promise.all([
      prisma.cost.findMany({
        where,
        orderBy: { effectiveFrom: "desc" },
        ...ToSkipTake(query),
      }),
      prisma.cost.count({ where }),
    ]);
    return {
      data: costs.map(ToCostDTO),
      pagination: BuildPaginationMeta(query, total),
    };
  },
});

export const POST = CreateApiRoute<SetNewCostInput, Params>({
  moduleName: "products.costs",
  schema: SetNewCostInputSchema,
  requiresAuth: { status: true, permission: "product:manage" },
  responseSchema: CostSchema,
  activity: async ({ body, params }) => {
    const name = await ProductName(params?.id);
    return {
      type: "pricing",
      action: "cost.set",
      message: `Set the cost of ${name} to ETB ${body.amountPerKg}/kg`,
      entityType: "product",
      entityId: params?.id,
      entityLabel: name,
      changes: { amountPerKg: body.amountPerKg },
    };
  },
  handler: async (body, session, params) => {
    const productId = params?.id;

    if (!productId) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // requiresAuth.status guarantees a session with an id by the time the
    // handler runs — see CreateApiRoute's 401 check.
    const createdById = session?.id;

    if (!createdById) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Close the prior active cost and insert the new one in the same
    // transaction — never mutate an existing row's amountPerKg, mirroring
    // SetNewProductPrice exactly.
    const cost = await prisma.$transaction(async (tx) => {
      const now = new Date();

      await tx.cost.updateMany({
        where: { productId, effectiveTo: null },
        data: { effectiveTo: now },
      });

      return tx.cost.create({
        data: {
          productId,
          amountPerKg: body.amountPerKg,
          effectiveFrom: now,
          createdById,
        },
      });
    });

    return ToCostDTO(cost);
  },
});
