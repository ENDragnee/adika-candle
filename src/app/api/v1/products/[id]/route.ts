import { NextResponse } from "next/server";
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
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import { prisma } from "@/lib/prisma";

type Params = { id: string };

export const GET = CreateApiRoute<unknown, Params, ProductDTO>({
  moduleName: "products",
  requiresAuth: { status: true, permission: "product:read" },
  responseSchema: ProductSchema,
  handler: async (_body, _session, params) => {
    const product = await prisma.product.findUnique({
      where: { id: params?.id },
      include: ACTIVE_PRICE_INCLUDE,
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return ToProductDTO(product);
  },
});

export const PATCH = CreateApiRoute<UpdateProductInput, Params, ProductDTO>({
  moduleName: "products",
  schema: UpdateProductInputSchema,
  requiresAuth: { status: true, permission: "product:manage" },
  responseSchema: ProductSchema,
  handler: async (body, _session, params) => {
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

    try {
      const product = await prisma.product.update({
        where: { id: params?.id },
        data: body,
        include: ACTIVE_PRICE_INCLUDE,
      });
      return ToProductDTO(product);
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
