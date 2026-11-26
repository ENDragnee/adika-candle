import type { Prisma } from "@/generated/prisma/client";
import {
  type CartonSize,
  KG_PER_CARTON,
  WAX_MATERIAL_NAME,
} from "@/lib/packing";
import { prisma } from "@/lib/prisma";
import { InPeriod, Sum, ZERO } from "./decimal";
import {
  BuildPeriodWindow,
  BuildRangeBuckets,
  BuildRangePeriod,
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
  type: "ACCEPT" | "SALE" | "ADJUSTMENT" | "SALE_VOID" | "SALE_RESTORE";
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

// |actual − expected| wax within this is normal noise (scale rounding,
// a few spoiled candles), not a deficit: 0.5% of the expected wax, and
// never less than 1 kg.
const WAX_TOLERANCE_RATIO = 0.005;
const WAX_TOLERANCE_MIN_KG = 1;

export type WaxCheckStatus = "UNDER" | "OVER" | "OK" | "NOT_COUNTED";

// Under-production check (2026-11-25). Each carton takes a fixed amount
// of wax (7 kg Normal, 8.5 kg Plus — src/lib/packing.ts), so the cartons
// produced say how much wax *should* have gone; accepting stock takes
// exactly that off the wax balance. What wax *actually* went is only
// known from a physical wax count: a count that finds less wax than
// recorded means more was used than the output accounts for — under-
// production (or waste/loss). Before automatic consumption, CONSUMED
// entries were typed in, so older periods compare those against output
// the same way.
export function ComputeWaxCheck(input: {
  expectedKg: Prisma.Decimal; // wax the accepted cartons account for
  producedCartons: Prisma.Decimal;
  consumedKg: Prisma.Decimal; // CONSUMED entries in the period
  countCorrectionKg: Prisma.Decimal; // signed ADJUSTMENT sum
  hasCount: boolean;
}) {
  // A count that finds less wax (negative correction) means that much
  // more was used.
  const actualKg = input.consumedKg.minus(input.countCorrectionKg);
  const gapKg = actualKg.minus(input.expectedKg);
  const kgPerCarton = input.producedCartons.greaterThan(0)
    ? input.expectedKg.dividedBy(input.producedCartons)
    : KG_PER_CARTON.NORMAL;
  const gapCartons = gapKg.dividedBy(kgPerCarton);
  const tolerance = Math.max(
    WAX_TOLERANCE_MIN_KG,
    input.expectedKg.toNumber() * WAX_TOLERANCE_RATIO,
  );
  const withinTolerance = gapKg.abs().toNumber() <= tolerance;

  let status: WaxCheckStatus;
  if (withinTolerance) status = input.hasCount ? "OK" : "NOT_COUNTED";
  else status = gapKg.greaterThan(0) ? "UNDER" : "OVER";

  return {
    status,
    expectedKg: input.expectedKg.toString(),
    actualKg: actualKg.toString(),
    countCorrectionKg: input.countCorrectionKg.toString(),
    gapKg: gapKg.toString(),
    gapCartons: gapCartons.toDecimalPlaces(6).toString(),
    hasCount: input.hasCount,
  };
}

export function ComputeProductionReport(input: {
  granularity: ReportGranularity | "CUSTOM";
  // Trend buckets, oldest first.
  periods: PeriodBounds[];
  // The period the tables describe; defaults to the last trend bucket.
  // A custom range passes the whole range here (Epic 22).
  period?: PeriodBounds;
  materials: { id: string; name: string; balanceKg: Prisma.Decimal }[];
  products: {
    id: string;
    name: string;
    sku: string;
    cartonSize: CartonSize;
    balanceKg: Prisma.Decimal;
  }[];
  materialEntries: MaterialMovement[];
  stockEntries: StockMovement[];
  offset: number;
}) {
  const { periods, materialEntries, stockEntries } = input;
  const period = input.period ?? periods[periods.length - 1];
  const sizeOf = new Map(
    input.products.map((product) => [product.id, product.cartonSize]),
  );
  // Stock is stored in kg; every finished-goods figure is reported in
  // cartons of that product.
  const ToCartons = (productId: string, kg: Prisma.Decimal) =>
    kg.dividedBy(KG_PER_CARTON[sizeOf.get(productId) ?? "NORMAL"]);
  const wax = input.materials.find(
    (material) =>
      material.name.toLowerCase() === WAX_MATERIAL_NAME.toLowerCase(),
  );

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
    // voided quantity back, so a voided sale nets to zero consumption;
    // SALE_RESTORE (Epic 24) takes it again.
    const consumed = Sum(
      inPeriod.filter(
        (entry) =>
          entry.type === "SALE" ||
          entry.type === "SALE_VOID" ||
          entry.type === "SALE_RESTORE",
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
    const Cartons = (kg: Prisma.Decimal) =>
      ToCartons(product.id, kg).toDecimalPlaces(6).toString();

    return {
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      cartonSize: product.cartonSize,
      openingCartons: Cartons(opening),
      producedCartons: Cartons(received),
      soldCartons: Cartons(consumed),
      adjustedCartons: Cartons(adjusted),
      closingCartons: Cartons(closing),
      // Produced kg is the wax those cartons took.
      waxKg: received.toString(),
    };
  });

  function WaxCheckFor(bounds: PeriodBounds) {
    const accepted = stockEntries.filter(
      (entry) => entry.type === "ACCEPT" && InPeriod(entry.createdAt, bounds),
    );
    const waxEntries = wax
      ? materialEntries.filter(
          (entry) =>
            entry.materialId === wax.id && InPeriod(entry.createdAt, bounds),
        )
      : [];
    const counts = waxEntries.filter((entry) => entry.type === "ADJUSTMENT");
    return ComputeWaxCheck({
      expectedKg: Sum(accepted, (entry) => entry.quantityKg),
      producedCartons: Sum(accepted, (entry) =>
        ToCartons(entry.productId, entry.quantityKg),
      ),
      consumedKg: Sum(
        waxEntries.filter((entry) => entry.type === "CONSUMED"),
        (entry) => entry.quantityKg,
      ),
      countCorrectionKg: Sum(counts, (entry) => entry.quantityKg),
      hasCount: counts.length > 0,
    });
  }

  const trend = periods.map((bounds) => {
    const check = WaxCheckFor(bounds);
    return {
      periodKey: bounds.key,
      periodLabel: bounds.label,
      producedCartons: Sum(
        stockEntries.filter(
          (entry) =>
            entry.type === "ACCEPT" && InPeriod(entry.createdAt, bounds),
        ),
        (entry) => ToCartons(entry.productId, entry.quantityKg),
      )
        .toDecimalPlaces(6)
        .toString(),
      waxExpectedKg: check.expectedKg,
      waxActualKg: check.actualKg,
    };
  });

  return {
    granularity: input.granularity,
    periodLabel: period.label,
    periodStart: period.start.toISOString(),
    periodEnd: period.end.toISOString(),
    offset: input.offset,
    hasNext: input.granularity !== "CUSTOM" && input.offset < 0,
    // Null when there's no Wax material to check against.
    waxCheck: wax ? WaxCheckFor(period) : null,
    materials,
    products,
    trend,
  };
}

export async function BuildProductionReport(
  granularity: ReportGranularity,
  offset = 0,
  range: { from: string; to: string } | null = null,
  now = new Date(),
) {
  const periods = range
    ? BuildRangeBuckets(range.from, range.to)
    : BuildPeriodWindow(granularity, now, offset);
  const period = range ? BuildRangePeriod(range.from, range.to) : undefined;
  // Everything from the first trend period up to now: the trend needs the
  // window, and reconstructing a past period's closing needs every
  // movement after it.
  const since = periods[0].start;

  const [materials, products, materialEntries, stockEntries] =
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
    ]);

  return ComputeProductionReport({
    granularity: range ? "CUSTOM" : granularity,
    periods,
    period,
    offset: range ? 0 : Math.min(0, offset),
    materials: materials.map((material) => ({
      id: material.id,
      name: material.name,
      balanceKg: material.balance?.quantityKg ?? ZERO,
    })),
    products: products.map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      cartonSize: product.cartonSize,
      balanceKg: product.stockBalance?.quantityKg ?? ZERO,
    })),
    materialEntries,
    stockEntries,
  });
}
