import { NextResponse } from "next/server";
import {
  CategorySchema,
  CreateCategoryInputSchema,
  ToCategoryDTO,
} from "@/features/categories/validators/category.schema";
import { Prisma } from "@/generated/prisma/client";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import {
  BuildPaginationMeta,
  PaginatedResponseSchema,
  PaginationQuerySchema,
  ToSkipTake,
} from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

export const GET = CreateApiRoute({
  moduleName: "categories",
  schema: PaginationQuerySchema,
  requiresAuth: { status: true, permission: "category:manage" },
  responseSchema: PaginatedResponseSchema(CategorySchema),
  handler: async (query) => {
    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        orderBy: { name: "asc" },
        ...ToSkipTake(query),
      }),
      prisma.category.count(),
    ]);
    return {
      data: categories.map(ToCategoryDTO),
      pagination: BuildPaginationMeta(query, total),
    };
  },
});

export const POST = CreateApiRoute({
  moduleName: "categories",
  schema: CreateCategoryInputSchema,
  requiresAuth: { status: true, permission: "category:manage" },
  responseSchema: CategorySchema,
  handler: async (body) => {
    try {
      const category = await prisma.category.create({ data: body });
      return ToCategoryDTO(category);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return NextResponse.json(
          { error: "A category with that name already exists" },
          { status: 409 },
        );
      }
      throw err;
    }
  },
});
