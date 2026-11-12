import { NextResponse } from "next/server";
import type {
  CategoryDTO,
  UpdateCategoryInput,
} from "@/features/categories/validators/category.schema";
import {
  CategorySchema,
  ToCategoryDTO,
  UpdateCategoryInputSchema,
} from "@/features/categories/validators/category.schema";
import { Prisma } from "@/generated/prisma/client";
import { ChangedFields } from "@/lib/activity/names";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import { prisma } from "@/lib/prisma";

type Params = { id: string };

export const PATCH = CreateApiRoute<UpdateCategoryInput, Params, CategoryDTO>({
  moduleName: "categories",
  schema: UpdateCategoryInputSchema,
  requiresAuth: { status: true, permission: "category:manage" },
  responseSchema: CategorySchema,
  activity: ({ body, result }) => ({
    type: "catalog",
    action:
      body.isActive === false
        ? "category.deactivate"
        : body.isActive === true
          ? "category.activate"
          : "category.update",
    message:
      body.isActive === false
        ? `Deactivated category ${result.name}`
        : body.isActive === true
          ? `Reactivated category ${result.name}`
          : `Edited category ${result.name} (${ChangedFields(body).join(", ")})`,
    entityType: "category",
    entityId: result.id,
    entityLabel: result.name,
    changes: { ...body },
  }),
  handler: async (body, _session, params) => {
    try {
      const category = await prisma.category.update({
        where: { id: params?.id },
        data: body,
      });
      return ToCategoryDTO(category);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2002") {
          return NextResponse.json(
            { error: "A category with that name already exists" },
            { status: 409 },
          );
        }
        if (err.code === "P2025") {
          return NextResponse.json(
            { error: "Category not found" },
            { status: 404 },
          );
        }
      }
      throw err;
    }
  },
});

export const DELETE = CreateApiRoute<unknown, Params, CategoryDTO>({
  moduleName: "categories",
  requiresAuth: { status: true, permission: "category:manage" },
  responseSchema: CategorySchema,
  activity: ({ result }) => ({
    type: "catalog",
    action: "category.deactivate",
    message: `Deactivated category ${result.name}`,
    entityType: "category",
    entityId: result.id,
    entityLabel: result.name,
  }),
  handler: async (_body, _session, params) => {
    try {
      const category = await prisma.category.update({
        where: { id: params?.id },
        data: { isActive: false },
      });
      return ToCategoryDTO(category);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2025"
      ) {
        return NextResponse.json(
          { error: "Category not found" },
          { status: 404 },
        );
      }
      throw err;
    }
  },
});
