import { NextResponse } from "next/server";
import {
  CreateUnitConversionInputSchema,
  ToUnitConversionDTO,
  UnitConversionListResponseSchema,
  UnitConversionSchema,
} from "@/features/unit-conversions/validators/unit-conversion.schema";
import { Prisma } from "@/generated/prisma/client";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import { prisma } from "@/lib/prisma";

export const GET = CreateApiRoute({
  moduleName: "unit-conversions",
  requiresAuth: { status: true, permission: "unit-conversion:manage" },
  responseSchema: UnitConversionListResponseSchema,
  handler: async () => {
    const units = await prisma.unitConversion.findMany({
      orderBy: { unitName: "asc" },
    });
    return units.map(ToUnitConversionDTO);
  },
});

export const POST = CreateApiRoute({
  moduleName: "unit-conversions",
  schema: CreateUnitConversionInputSchema,
  requiresAuth: { status: true, permission: "unit-conversion:manage" },
  responseSchema: UnitConversionSchema,
  handler: async (body) => {
    try {
      const unit = await prisma.unitConversion.create({ data: body });
      return ToUnitConversionDTO(unit);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return NextResponse.json(
          { error: "A unit with that name already exists" },
          { status: 409 },
        );
      }
      throw err;
    }
  },
});
