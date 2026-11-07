import { NextResponse } from "next/server";
import {
  CategoryListResponseSchema,
  CategorySchema,
  CreateCategoryInputSchema,
  ToCategoryDTO,
} from "@/features/categories/validators/category.schema";
import { Prisma } from "@/generated/prisma/client";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import { prisma } from "@/lib/prisma";

export const GET = CreateApiRoute({
  moduleName: "categories",
  requiresAuth: { status: true, permission: "category:manage" },
  responseSchema: CategoryListResponseSchema,
  handler: async () => {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });
    return categories.map(ToCategoryDTO);
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
