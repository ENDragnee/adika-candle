import { NextResponse } from "next/server";
import {
  ACTIVE_PRICE_INCLUDE,
  CreateProductInputSchema,
  ProductQuerySchema,
  ProductSchema,
  ToProductDTO,
} from "@/features/products/validators/product.schema";
import { Prisma } from "@/generated/prisma/client";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import { GenerateCode } from "@/lib/generate-code";
import {
  BuildPaginationMeta,
  PaginatedResponseSchema,
  PaginationQuerySchema,
  ToSkipTake,
} from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

const MAX_SKU_ATTEMPTS = 5;

function GenerateSku(): string {
  const code = GenerateCode();

  if (!code) {
    throw new Error("Failed to generate a product SKU");
  }

  return code;
}

const ProductsQuerySchema = ProductQuerySchema.extend(
  PaginationQuerySchema.shape,
);

export const GET = CreateApiRoute({
  moduleName: "products",
  schema: ProductsQuerySchema,
  requiresAuth: { status: true, permission: "product:read" },
  responseSchema: PaginatedResponseSchema(ProductSchema),
  handler: async (query) => {
    const where: Prisma.ProductWhereInput | undefined = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" } },
            { sku: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : undefined;
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: [{ [query.sort]: query.dir }, { id: "asc" }],
        include: ACTIVE_PRICE_INCLUDE,
        ...ToSkipTake(query),
      }),
      prisma.product.count({ where }),
    ]);
    return {
      data: products.map(ToProductDTO),
      pagination: BuildPaginationMeta(query, total),
    };
  },
});

export const POST = CreateApiRoute({
  moduleName: "products",
  schema: CreateProductInputSchema,
  requiresAuth: { status: true, permission: "product:manage" },
  responseSchema: ProductSchema,
  handler: async (body) => {
    const category = await prisma.category.findUnique({
      where: { id: body.categoryId },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    for (let attempt = 0; attempt < MAX_SKU_ATTEMPTS; attempt++) {
      try {
        const product = await prisma.product.create({
          data: {
            name: body.name,
            categoryId: body.categoryId,
            sku: GenerateSku(),
          },
          include: ACTIVE_PRICE_INCLUDE,
        });
        return ToProductDTO(product);
      } catch (err) {
        const isSkuCollision =
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002";

        if (!isSkuCollision || attempt === MAX_SKU_ATTEMPTS - 1) {
          throw err;
        }
      }
    }

    // Unreachable — the loop above always returns or throws.
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  },
});
