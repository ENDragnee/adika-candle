import { NextResponse } from "next/server";
import type {
  RawMaterialDTO,
  UpdateRawMaterialInput,
} from "@/features/raw-materials/validators/raw-material.schema";
import {
  RawMaterialSchema,
  ToRawMaterialDTO,
  UpdateRawMaterialInputSchema,
} from "@/features/raw-materials/validators/raw-material.schema";
import { Prisma } from "@/generated/prisma/client";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import { prisma } from "@/lib/prisma";

type Params = { id: string };

export const GET = CreateApiRoute<unknown, Params, RawMaterialDTO>({
  moduleName: "raw-materials",
  requiresAuth: {
    status: true,
    permission: ["raw-material:read", "raw-material:manage"],
  },
  responseSchema: RawMaterialSchema,
  handler: async (_body, _session, params) => {
    const material = await prisma.rawMaterial.findUnique({
      where: { id: params?.id },
    });

    if (!material) {
      return NextResponse.json(
        { error: "Raw material not found" },
        { status: 404 },
      );
    }

    return ToRawMaterialDTO(material);
  },
});

export const PATCH = CreateApiRoute<
  UpdateRawMaterialInput,
  Params,
  RawMaterialDTO
>({
  moduleName: "raw-materials",
  schema: UpdateRawMaterialInputSchema,
  requiresAuth: { status: true, permission: "raw-material:manage" },
  responseSchema: RawMaterialSchema,
  handler: async (body, _session, params) => {
    try {
      const material = await prisma.rawMaterial.update({
        where: { id: params?.id },
        data: body,
      });
      return ToRawMaterialDTO(material);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2002") {
          return NextResponse.json(
            { error: "A raw material with that name already exists" },
            { status: 409 },
          );
        }
        if (err.code === "P2025") {
          return NextResponse.json(
            { error: "Raw material not found" },
            { status: 404 },
          );
        }
      }
      throw err;
    }
  },
});
