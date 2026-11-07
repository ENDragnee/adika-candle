import { NextResponse } from "next/server";
import type {
  UnitConversionDTO,
  UpdateUnitConversionInput,
} from "@/features/unit-conversions/validators/unit-conversion.schema";
import {
  ToUnitConversionDTO,
  UnitConversionSchema,
  UpdateUnitConversionInputSchema,
} from "@/features/unit-conversions/validators/unit-conversion.schema";
import { Prisma } from "@/generated/prisma/client";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import { prisma } from "@/lib/prisma";

type Params = { id: string };

export const PATCH = CreateApiRoute<
  UpdateUnitConversionInput,
  Params,
  UnitConversionDTO
>({
  moduleName: "unit-conversions",
  schema: UpdateUnitConversionInputSchema,
  requiresAuth: { status: true, permission: "unit-conversion:manage" },
  responseSchema: UnitConversionSchema,
  handler: async (body, _session, params) => {
    try {
      const unit = await prisma.unitConversion.update({
        where: { id: params?.id },
        data: body,
      });
      return ToUnitConversionDTO(unit);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2025"
      ) {
        return NextResponse.json(
          { error: "Unit conversion not found" },
          { status: 404 },
        );
      }
      throw err;
    }
  },
});

export const DELETE = CreateApiRoute<unknown, Params, UnitConversionDTO>({
  moduleName: "unit-conversions",
  requiresAuth: { status: true, permission: "unit-conversion:manage" },
  responseSchema: UnitConversionSchema,
  handler: async (_body, _session, params) => {
    try {
      const unit = await prisma.unitConversion.update({
        where: { id: params?.id },
        data: { isActive: false },
      });
      return ToUnitConversionDTO(unit);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2025"
      ) {
        return NextResponse.json(
          { error: "Unit conversion not found" },
          { status: 404 },
        );
      }
      throw err;
    }
  },
});
