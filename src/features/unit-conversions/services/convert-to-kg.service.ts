import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

// Thrown instead of a generic Error so callers (Epic 4's "Accept Stock" and
// Epic 6's "Record Sale") can catch it specifically and map it to a 400.
export class UnknownUnitError extends Error {
  constructor(unitName: string) {
    super(`Unknown or inactive unit: ${unitName}`);
    this.name = "UnknownUnitError";
  }
}

// Shared conversion primitive for Epics 4 (Stock) and 6 (Sales) — don't
// reimplement this in either feature. unitName is validated against the
// live UnitConversion table with Zod, not the type system, since the unit
// set is Manager-editable at runtime (see docs/DECISIONS.md).
export async function convertToKg(
  unitName: string,
  qty: number,
): Promise<number> {
  const activeUnits = await prisma.unitConversion.findMany({
    where: { isActive: true },
  });

  const activeUnitNames = activeUnits.map((unit) => unit.unitName);

  if (activeUnitNames.length === 0) {
    throw new UnknownUnitError(unitName);
  }

  const UnitNameSchema = z.enum(activeUnitNames as [string, ...string[]]);
  const validation = UnitNameSchema.safeParse(unitName);

  if (!validation.success) {
    throw new UnknownUnitError(unitName);
  }

  const unit = activeUnits.find((u) => u.unitName === validation.data);

  if (!unit) {
    throw new UnknownUnitError(unitName);
  }

  return new Prisma.Decimal(qty).times(unit.ratioToKg).toNumber();
}
