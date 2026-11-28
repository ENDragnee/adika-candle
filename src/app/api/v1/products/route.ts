import { NextResponse } from "next/server";
import { CanSeeCost } from "@/features/products/cost-access";
import {
  PINNED_PRODUCT_NAMES,
  PinnedPageWindow,
  SortPinnedFirst,
} from "@/features/products/product-order";
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
  handler: async (query, session) => {
    const where: Prisma.ProductWhereInput = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" } },
            { sku: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {};
    const orderBy: Prisma.ProductOrderByWithRelationInput[] = [
      { [query.sort]: query.dir },
      { id: "asc" },
    ];
    // Pinned products (Marel, Plus, Color) come first whatever the sort.
    // Prisma can't order by a custom list, so they're fetched on their
    // own (there are only a few) and the rest is paginated after them —
    // see docs/DECISIONS.md, "Pinned products".
    const isPinned: Prisma.ProductWhereInput = {
      OR: PINNED_PRODUCT_NAMES.map((name) => ({
        name: { equals: name, mode: "insensitive" },
      })),
    };
    const [pinnedRows, total] = await Promise.all([
      prisma.product.findMany({
        where: { AND: [where, isPinned] },
        orderBy,
        include: ACTIVE_PRICE_INCLUDE,
      }),
      prisma.product.count({ where }),
    ]);
    const pinned = SortPinnedFirst(pinnedRows);
    const { skip, take } = ToSkipTake(query);
    const page = PinnedPageWindow(skip, take, pinned.length);
    const rest =
      page.restTake > 0
        ? await prisma.product.findMany({
            where: { AND: [where, { NOT: isPinned }] },
            orderBy,
            include: ACTIVE_PRICE_INCLUDE,
            skip: page.restSkip,
            take: page.restTake,
          })
        : [];
    const products = [
      ...pinned.slice(page.pinnedStart, page.pinnedEnd),
      ...rest,
    ];
    return {
      data: products.map((product) =>
        ToProductDTO(product, CanSeeCost(session?.permissions)),
      ),
      pagination: BuildPaginationMeta(query, total),
    };
  },
});

export const POST = CreateApiRoute({
  moduleName: "products",
  schema: CreateProductInputSchema,
  requiresAuth: { status: true, permission: "product:manage" },
  responseSchema: ProductSchema,
  activity: ({ result }) => ({
    type: "catalog",
    action: "product.create",
    message: `Created product ${result.name}`,
    entityType: "product",
    entityId: result.id,
    entityLabel: result.name,
  }),
  handler: async (body, session) => {
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
            cartonSize: body.cartonSize,
            sku: GenerateSku(),
          },
          include: ACTIVE_PRICE_INCLUDE,
        });
        return ToProductDTO(product, CanSeeCost(session?.permissions));
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
