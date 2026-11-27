import { NextResponse } from "next/server";
import { CanSeeCost } from "@/features/products/cost-access";
import type {
  ProductDTO,
  UpdateProductInput,
} from "@/features/products/validators/product.schema";
import {
  ACTIVE_PRICE_INCLUDE,
  ProductSchema,
  ToProductDTO,
  UpdateProductInputSchema,
} from "@/features/products/validators/product.schema";
import { Prisma } from "@/generated/prisma/client";
import { ChangedFields } from "@/lib/activity/names";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import { KgFromCartons } from "@/lib/carton-decimal";
import { prisma } from "@/lib/prisma";

type Params = { id: string };

export const GET = CreateApiRoute<unknown, Params, ProductDTO>({
  moduleName: "products",
  requiresAuth: { status: true, permission: "product:read" },
  responseSchema: ProductSchema,
  handler: async (_body, session, params) => {
    const product = await prisma.product.findUnique({
      where: { id: params?.id },
      include: ACTIVE_PRICE_INCLUDE,
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return ToProductDTO(product, CanSeeCost(session?.permissions));
  },
});

export const PATCH = CreateApiRoute<UpdateProductInput, Params, ProductDTO>({
  moduleName: "products",
  schema: UpdateProductInputSchema,
  requiresAuth: { status: true, permission: "product:manage" },
  responseSchema: ProductSchema,
  activity: ({ body, result }) => ({
    type: "catalog",
    action:
      body.isActive === false
        ? "product.deactivate"
        : body.isActive === true
          ? "product.activate"
          : "product.update",
    message:
      body.isActive === false
        ? `Deactivated product ${result.name}`
        : body.isActive === true
          ? `Reactivated product ${result.name}`
          : `Edited product ${result.name} (${ChangedFields(body).join(", ")})`,
    entityType: "product",
    entityId: result.id,
    entityLabel: result.name,
    changes: { ...body },
  }),
  handler: async (body, session, params) => {
    if (body.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: body.categoryId },
      });

      if (!category) {
        return NextResponse.json(
          { error: "Category not found" },
          { status: 404 },
        );
      }
    }

    const existing = await prisma.product.findUnique({
      where: { id: params?.id },
      include: { _count: { select: { stockLedgerEntries: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    // Stored kg ÷ kg-per-carton is the carton count, so changing the size
    // after stock has moved would silently re-scale every recorded figure.
    if (
      body.cartonSize &&
      body.cartonSize !== existing.cartonSize &&
      existing._count.stockLedgerEntries > 0
    ) {
      return NextResponse.json(
        {
          error:
            "This product already has stock history, so its carton size can't change",
          code: "CARTON_SIZE_LOCKED",
        },
        { status: 409 },
      );
    }

    const { lowStockThresholdCartons, ...rest } = body;
    const size = body.cartonSize ?? existing.cartonSize;

    try {
      const product = await prisma.product.update({
        where: { id: params?.id },
        data: {
          ...rest,
          ...(lowStockThresholdCartons !== undefined && {
            lowStockThresholdKg:
              lowStockThresholdCartons === null
                ? null
                : KgFromCartons(
                    new Prisma.Decimal(lowStockThresholdCartons),
                    size,
                  ),
          }),
        },
        include: ACTIVE_PRICE_INCLUDE,
      });
      return ToProductDTO(product, CanSeeCost(session?.permissions));
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2025"
      ) {
        return NextResponse.json(
          { error: "Product not found" },
          { status: 404 },
        );
      }
      throw err;
    }
  },
});
