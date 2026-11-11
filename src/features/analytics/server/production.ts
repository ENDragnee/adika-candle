import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { InPeriod, Sum, ZERO } from "./decimal";
import {
  BuildPeriodWindow,
  type PeriodBounds,
  type ReportGranularity,
} from "./periods";

// Ledger quantities, normalized to a signed delta (+ in, − out).
// StockLedgerEntry.quantityKg is already signed (SALE is stored negative);
// RawMaterialLedgerEntry stores a positive magnitude for RECEIVED/CONSUMED
// with direction implied by type, and a signed delta for ADJUSTMENT.
export interface MaterialMovement {
  materialId: string;
  type: "RECEIVED" | "CONSUMED" | "ADJUSTMENT";
  quantityKg: Prisma.Decimal;
  createdAt: Date;
}

export interface StockMovement {
  productId: string;
  type: "ACCEPT" | "SALE" | "ADJUSTMENT" | "SALE_VOID";
  quantityKg: Prisma.Decimal; // signed
  createdAt: Date;
}

export function MaterialDelta(entry: MaterialMovement): Prisma.Decimal {
  if (entry.type === "RECEIVED") return entry.quantityKg;
  if (entry.type === "CONSUMED") return entry.quantityKg.negated();
  return entry.quantityKg;
}

// Opening/closing for a past period, reconstructed from the live balance:
// closing = live balance − every movement after the period ended;
// opening = closing − every movement inside the period. Using the full
// signed delta (adjustments and voids included) is what keeps
// Opening + Received − Consumed ± Adjusted = Closing true on every row —
// before Epic 21 adjustments were ignored and the opening figure drifted.
function OpeningClosing<T>(
  liveBalance: Prisma.Decimal,
  entries: T[],
  period: PeriodBounds,
  delta: (entry: T) => Prisma.Decimal,
  createdAt: (entry: T) => Date,
) {
  const after = Sum(
    entries.filter((entry) => createdAt(entry) >= period.end),
    delta,
  );
  const within = Sum(
    entries.filter((entry) => InPeriod(createdAt(entry), period)),
    delta,
  );
  const closing = liveBalance.minus(after);
  return { opening: closing.minus(within), closing };
}

export function ComputeProductionReport(input: {
  granularity: ReportGranularity;
  periods: PeriodBounds[];
  materials: { id: string; name: string; balanceKg: Prisma.Decimal }[];
  products: {
    id: string;
    name: string;
    sku: string;
    balanceKg: Prisma.Decimal;
  }[];
  materialEntries: MaterialMovement[];
  stockEntries: StockMovement[];
  requirements: {
    productId: string;
    materialId: string;
    quantityKgPerOutputKg: Prisma.Decimal;
  }[];
  offset: number;
}) {
  const { periods, materialEntries, stockEntries } = input;
  const period = periods[periods.length - 1];
  const materialConsumed = new Map<string, Prisma.Decimal>();

  const materials = input.materials.map((material) => {
    const entries = materialEntries.filter(
      (entry) => entry.materialId === material.id,
    );
    const inPeriod = entries.filter((entry) =>
      InPeriod(entry.createdAt, period),
    );
    const received = Sum(
      inPeriod.filter((entry) => entry.type === "RECEIVED"),
      (entry) => entry.quantityKg,
    );
    const consumed = Sum(
      inPeriod.filter((entry) => entry.type === "CONSUMED"),
      (entry) => entry.quantityKg,
    );
    const adjusted = Sum(
      inPeriod.filter((entry) => entry.type === "ADJUSTMENT"),
      (entry) => entry.quantityKg,
    );
    const { opening, closing } = OpeningClosing(
      material.balanceKg,
      entries,
      period,
      MaterialDelta,
      (entry) => entry.createdAt,
    );
    materialConsumed.set(material.id, consumed);

    return {
      materialId: material.id,
      materialName: material.name,
      openingKg: opening.toString(),
      receivedKg: received.toString(),
      consumedKg: consumed.toString(),
      adjustedKg: adjusted.toString(),
      closingKg: closing.toString(),
    };
  });

  const products = input.products.map((product) => {
    const entries = stockEntries.filter(
      (entry) => entry.productId === product.id,
    );
    const inPeriod = entries.filter((entry) =>
      InPeriod(entry.createdAt, period),
    );
    const received = Sum(
      inPeriod.filter((entry) => entry.type === "ACCEPT"),
      (entry) => entry.quantityKg,
    );
    // Net sold: SALE entries are negative, SALE_VOID entries give the
    // voided quantity back, so a voided sale nets to zero consumption.
    const consumed = Sum(
      inPeriod.filter(
        (entry) => entry.type === "SALE" || entry.type === "SALE_VOID",
      ),
      (entry) => entry.quantityKg,
    ).negated();
    const adjusted = Sum(
      inPeriod.filter((entry) => entry.type === "ADJUSTMENT"),
      (entry) => entry.quantityKg,
    );
    const { opening, closing } = OpeningClosing(
      product.balanceKg,
      entries,
      period,
      (entry) => entry.quantityKg,
      (entry) => entry.createdAt,
    );

    // "Expected output" is bottlenecked by whichever required material
    // would run out soonest — see docs/DECISIONS.md, "Epic 17 decisions"
    // (raw-material consumption isn't attributed per product, so this is
    // an estimate when a material is shared across recipes).
    const recipe = input.requirements.filter(
      (requirement) => requirement.productId === product.id,
    );
    let expectedOutputKg: string | null = null;
    let variancePercent: string | null = null;

    if (recipe.length > 0) {
      const expected = recipe
        .map((requirement) =>
          (materialConsumed.get(requirement.materialId) ?? ZERO).dividedBy(
            requirement.quantityKgPerOutputKg,
          ),
        )
        .reduce((min, value) => (value.lessThan(min) ? value : min));
      expectedOutputKg = expected.toString();
      if (expected.greaterThan(0)) {
        variancePercent = received
          .minus(expected)
          .dividedBy(expected)
          .times(100)
          .toFixed(1);
      }
    }

    return {
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      openingKg: opening.toString(),
      receivedKg: received.toString(),
      consumedKg: consumed.toString(),
      adjustedKg: adjusted.toString(),
      closingKg: closing.toString(),
      expectedOutputKg,
      variancePercent,
    };
  });

  const trend = periods.map((bounds) => ({
    periodKey: bounds.key,
    periodLabel: bounds.label,
    materialConsumedKg: Sum(
      materialEntries.filter(
        (entry) =>
          entry.type === "CONSUMED" && InPeriod(entry.createdAt, bounds),
      ),
      (entry) => entry.quantityKg,
    ).toString(),
    productActualOutputKg: Sum(
      stockEntries.filter(
        (entry) => entry.type === "ACCEPT" && InPeriod(entry.createdAt, bounds),
      ),
      (entry) => entry.quantityKg,
    ).toString(),
  }));

  return {
    granularity: input.granularity,
    periodLabel: period.label,
    periodStart: period.start.toISOString(),
    periodEnd: period.end.toISOString(),
    offset: input.offset,
    hasNext: input.offset < 0,
    materials,
    products,
    trend,
  };
}

export async function BuildProductionReport(
  granularity: ReportGranularity,
  offset = 0,
  now = new Date(),
) {
  const periods = BuildPeriodWindow(granularity, now, offset);
  // Everything from the first trend period up to now: the trend needs the
  // window, and reconstructing a past period's closing needs every
  // movement after it.
  const since = periods[0].start;

  const [materials, products, materialEntries, stockEntries, requirements] =
    await Promise.all([
      prisma.rawMaterial.findMany({
        where: { isActive: true },
        include: { balance: true },
        orderBy: { name: "asc" },
      }),
      prisma.product.findMany({
        where: { isActive: true },
        include: { stockBalance: true },
        orderBy: { name: "asc" },
      }),
      prisma.rawMaterialLedgerEntry.findMany({
        where: { createdAt: { gte: since } },
      }),
      prisma.stockLedgerEntry.findMany({
        where: { createdAt: { gte: since } },
      }),
      prisma.productMaterialRequirement.findMany(),
    ]);

  return ComputeProductionReport({
    granularity,
    periods,
    offset: Math.min(0, offset),
    materials: materials.map((material) => ({
      id: material.id,
      name: material.name,
      balanceKg: material.balance?.quantityKg ?? ZERO,
    })),
    products: products.map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      balanceKg: product.stockBalance?.quantityKg ?? ZERO,
    })),
    materialEntries,
    stockEntries,
    requirements,
  });
}
