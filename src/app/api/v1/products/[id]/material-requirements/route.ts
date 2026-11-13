import { NextResponse } from "next/server";
import type {
  CreateMaterialRequirementInput,
  ProductMaterialRequirementDTO,
  UpdateMaterialRequirementInput,
} from "@/features/raw-materials/validators/material-requirement.schema";
import {
  CreateMaterialRequirementInputSchema,
  ProductMaterialRequirementListResponseSchema,
  ProductMaterialRequirementSchema,
  ToProductMaterialRequirementDTO,
  UpdateMaterialRequirementInputSchema,
} from "@/features/raw-materials/validators/material-requirement.schema";
import { Prisma } from "@/generated/prisma/client";
import { ProductName } from "@/lib/activity/names";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import { prisma } from "@/lib/prisma";

type Params = { id: string };

export const GET = CreateApiRoute<
  unknown,
  Params,
  ProductMaterialRequirementDTO[]
>({
  moduleName: "products.material-requirements",
  requiresAuth: { status: true, permission: "raw-material:manage" },
  responseSchema: ProductMaterialRequirementListResponseSchema,
  handler: async (_body, _session, params) => {
    const requirements = await prisma.productMaterialRequirement.findMany({
      where: { productId: params?.id },
      include: { material: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    });
    return requirements.map(ToProductMaterialRequirementDTO);
  },
});

export const POST = CreateApiRoute<
  CreateMaterialRequirementInput,
  Params,
  ProductMaterialRequirementDTO
>({
  moduleName: "products.material-requirements",
  schema: CreateMaterialRequirementInputSchema,
  requiresAuth: { status: true, permission: "raw-material:manage" },
  responseSchema: ProductMaterialRequirementSchema,
  activity: async ({ result, params }) => {
    const name = await ProductName(params?.id);
    return {
      type: "catalog",
      action: "recipe.add",
      message: `Added ${result.materialName} to the recipe of ${name}`,
      entityType: "product",
      entityId: params?.id,
      entityLabel: name,
      changes: {
        material: result.materialName,
        quantityKgPerOutputKg: result.quantityKgPerOutputKg,
      },
    };
  },
  handler: async (body, _session, params) => {
    const productId = params?.id;

    if (!productId) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    try {
      const requirement = await prisma.productMaterialRequirement.create({
        data: {
          productId,
          materialId: body.materialId,
          quantityKgPerOutputKg: body.quantityKgPerOutputKg,
        },
        include: { material: { select: { name: true } } },
      });
      return ToProductMaterialRequirementDTO(requirement);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return NextResponse.json(
          { error: "This product already has a requirement for that material" },
          { status: 409 },
        );
      }
      throw err;
    }
  },
});

export const PATCH = CreateApiRoute<
  UpdateMaterialRequirementInput,
  Params,
  ProductMaterialRequirementDTO
>({
  moduleName: "products.material-requirements",
  schema: UpdateMaterialRequirementInputSchema,
  requiresAuth: { status: true, permission: "raw-material:manage" },
  responseSchema: ProductMaterialRequirementSchema,
  activity: async ({ result, params }) => {
    const name = await ProductName(params?.id);
    return {
      type: "catalog",
      action: "recipe.update",
      message: `Changed ${result.materialName} in the recipe of ${name}`,
      entityType: "product",
      entityId: params?.id,
      entityLabel: name,
      changes: {
        material: result.materialName,
        quantityKgPerOutputKg: result.quantityKgPerOutputKg,
      },
    };
  },
  handler: async (body, _session, params) => {
    const productId = params?.id;

    if (!productId) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    try {
      const requirement = await prisma.productMaterialRequirement.update({
        where: {
          productId_materialId: {
            productId,
            materialId: body.materialId,
          },
        },
        data: { quantityKgPerOutputKg: body.quantityKgPerOutputKg },
        include: { material: { select: { name: true } } },
      });
      return ToProductMaterialRequirementDTO(requirement);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2025"
      ) {
        return NextResponse.json(
          { error: "No requirement found for that material" },
          { status: 404 },
        );
      }
      throw err;
    }
  },
});
