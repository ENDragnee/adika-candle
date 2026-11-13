import { NextResponse } from "next/server";
import {
  CreateUnitConversionInputSchema,
  ToUnitConversionDTO,
  UnitConversionSchema,
} from "@/features/unit-conversions/validators/unit-conversion.schema";
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
  moduleName: "unit-conversions",
  schema: PaginationQuerySchema,
  // Read access is also granted to stock:accept — Epic 4's "Accept Stock"
  // form (and Epic 6's "Record Sale") need the live unit list to validate
  // against, but neither should be able to create/edit/deactivate units via
  // the POST/PATCH/DELETE routes below, which stay unit-conversion:manage
  // only.
  requiresAuth: {
    status: true,
    permission: ["unit-conversion:manage", "stock:accept"],
  },
  responseSchema: PaginatedResponseSchema(UnitConversionSchema),
  handler: async (query) => {
    const [units, total] = await Promise.all([
      prisma.unitConversion.findMany({
        orderBy: { unitName: "asc" },
        ...ToSkipTake(query),
      }),
      prisma.unitConversion.count(),
    ]);
    return {
      data: units.map(ToUnitConversionDTO),
      pagination: BuildPaginationMeta(query, total),
    };
  },
});

export const POST = CreateApiRoute({
  moduleName: "unit-conversions",
  schema: CreateUnitConversionInputSchema,
  requiresAuth: { status: true, permission: "unit-conversion:manage" },
  responseSchema: UnitConversionSchema,
  activity: ({ result }) => ({
    type: "settings",
    action: "unit.create",
    message: `Added unit ${result.unitName} (${result.ratioToKg} kg)`,
    entityType: "unit",
    entityId: result.id,
    entityLabel: result.unitName,
  }),
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
