import { NextResponse } from "next/server";
import {
  CreateRawMaterialInputSchema,
  RawMaterialSchema,
  ToRawMaterialDTO,
} from "@/features/raw-materials/validators/raw-material.schema";
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
  moduleName: "raw-materials",
  schema: PaginationQuerySchema,
  // Inventory Manager needs to read the catalog too, to populate the
  // material picker on "Record activity" — read-only for them, full CRUD
  // for Manager. Mirrors the loans-transactions route's multi-permission
  // gate.
  requiresAuth: {
    status: true,
    permission: ["raw-material:read", "raw-material:manage"],
  },
  responseSchema: PaginatedResponseSchema(RawMaterialSchema),
  handler: async (query) => {
    const [materials, total] = await Promise.all([
      prisma.rawMaterial.findMany({
        orderBy: { name: "asc" },
        ...ToSkipTake(query),
      }),
      prisma.rawMaterial.count(),
    ]);
    return {
      data: materials.map(ToRawMaterialDTO),
      pagination: BuildPaginationMeta(query, total),
    };
  },
});

export const POST = CreateApiRoute({
  moduleName: "raw-materials",
  schema: CreateRawMaterialInputSchema,
  requiresAuth: { status: true, permission: "raw-material:manage" },
  responseSchema: RawMaterialSchema,
  handler: async (body) => {
    try {
      const material = await prisma.rawMaterial.create({ data: body });
      return ToRawMaterialDTO(material);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return NextResponse.json(
          { error: "A raw material with that name already exists" },
          { status: 409 },
        );
      }
      throw err;
    }
  },
});
