import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { BuildPeriodWindow } from "../periods";
import {
  ComputeProductionReport,
  ComputeWaxCheck,
  type MaterialMovement,
  type StockMovement,
} from "../production";

const D = (value: number) => new Prisma.Decimal(value);
const NOW = new Date("2026-11-11T09:00:00Z");
const TODAY = new Date("2026-11-11T06:00:00Z");
const YESTERDAY = new Date("2026-11-10T06:00:00Z");

function Report(input: {
  offset?: number;
  stockEntries?: StockMovement[];
  materialEntries?: MaterialMovement[];
  productBalance?: number;
  materialBalance?: number;
}) {
  const offset = input.offset ?? 0;
  return ComputeProductionReport({
    granularity: "DAY",
    periods: BuildPeriodWindow("DAY", NOW, offset),
    offset,
    materials: [
      { id: "m1", name: "Wax", balanceKg: D(input.materialBalance ?? 0) },
    ],
    products: [
      {
        id: "p1",
        name: "Candle",
        sku: "S1",
        cartonSize: "NORMAL",
        balanceKg: D(input.productBalance ?? 0),
      },
    ],
    materialEntries: input.materialEntries ?? [],
    stockEntries: input.stockEntries ?? [],
  });
}

describe("ComputeProductionReport", () => {
  it("keeps opening + in − out ± adjustments = closing with adjustments present", () => {
    // Normal cartons are 7 kg. Balance now 49 kg (7 ctn) = 0 + accept 10
    // ctn − sale 2 ctn − adjustment 1 ctn.
    const report = Report({
      productBalance: 49,
      stockEntries: [
        {
          productId: "p1",
          type: "ACCEPT",
          quantityKg: D(70),
          createdAt: TODAY,
        },
        { productId: "p1", type: "SALE", quantityKg: D(-14), createdAt: TODAY },
        {
          productId: "p1",
          type: "ADJUSTMENT",
          quantityKg: D(-7),
          createdAt: TODAY,
        },
      ],
    });
    const [row] = report.products;
    expect(row.openingCartons).toBe("0");
    expect(row.producedCartons).toBe("10");
    expect(row.soldCartons).toBe("2");
    expect(row.adjustedCartons).toBe("-1");
    expect(row.closingCartons).toBe("7");
    expect(row.waxKg).toBe("70");
  });

  it("nets a voided sale out of consumption", () => {
    const report = Report({
      productBalance: 0,
      stockEntries: [
        { productId: "p1", type: "SALE", quantityKg: D(-10), createdAt: TODAY },
        {
          productId: "p1",
          type: "SALE_VOID",
          quantityKg: D(10),
          createdAt: TODAY,
        },
      ],
    });
    expect(report.products[0].soldCartons).toBe("0");
  });

  it("reconstructs a past period's closing from later movements", () => {
    // Yesterday: received 100 wax. Today: consumed 30. Live balance 70.
    const report = Report({
      offset: -1,
      materialBalance: 70,
      materialEntries: [
        {
          materialId: "m1",
          type: "RECEIVED",
          quantityKg: D(100),
          createdAt: YESTERDAY,
        },
        {
          materialId: "m1",
          type: "CONSUMED",
          quantityKg: D(30),
          createdAt: TODAY,
        },
      ],
    });
    const [row] = report.materials;
    expect(report.hasNext).toBe(true);
    expect(row.openingKg).toBe("0");
    expect(row.receivedKg).toBe("100");
    expect(row.closingKg).toBe("100");
  });
});

describe("ComputeWaxCheck", () => {
  const Check = (input: {
    expectedKg: number;
    producedCartons: number;
    consumedKg: number;
    countCorrectionKg?: number;
    hasCount?: boolean;
  }) =>
    ComputeWaxCheck({
      expectedKg: D(input.expectedKg),
      producedCartons: D(input.producedCartons),
      consumedKg: D(input.consumedKg),
      countCorrectionKg: D(input.countCorrectionKg ?? 0),
      hasCount: input.hasCount ?? false,
    });

  it("can't call it without a wax count when consumption is automatic", () => {
    // 200 Normal cartons took 1,400 kg, consumed automatically.
    const check = Check({
      expectedKg: 1400,
      producedCartons: 200,
      consumedKg: 1400,
    });
    expect(check.status).toBe("NOT_COUNTED");
    expect(check.gapKg).toBe("0");
  });

  it("flags under-production when a count finds less wax than recorded", () => {
    // A count found 70 kg less wax than the books: 10 cartons' worth.
    const check = Check({
      expectedKg: 1400,
      producedCartons: 200,
      consumedKg: 1400,
      countCorrectionKg: -70,
      hasCount: true,
    });
    expect(check.status).toBe("UNDER");
    expect(check.actualKg).toBe("1470");
    expect(check.gapCartons).toBe("10");
  });

  it("is OK when a count matches", () => {
    const check = Check({
      expectedKg: 1400,
      producedCartons: 200,
      consumedKg: 1400,
      countCorrectionKg: -2,
      hasCount: true,
    });
    expect(check.status).toBe("OK");
  });

  it("flags more output than wax when a count finds extra wax", () => {
    const check = Check({
      expectedKg: 850,
      producedCartons: 100,
      consumedKg: 850,
      countCorrectionKg: 85,
      hasCount: true,
    });
    expect(check.status).toBe("OVER");
    // Plus cartons: 85 kg ÷ 8.5 = 10 cartons.
    expect(check.gapCartons).toBe("-10");
  });
});

describe("ComputeProductionReport wax check", () => {
  it("compares production against the Wax material's movements", () => {
    const report = Report({
      materialBalance: 0,
      stockEntries: [
        {
          productId: "p1",
          type: "ACCEPT",
          quantityKg: D(70),
          createdAt: TODAY,
        },
      ],
      materialEntries: [
        {
          materialId: "m1",
          type: "CONSUMED",
          quantityKg: D(70),
          createdAt: TODAY,
        },
        {
          materialId: "m1",
          type: "ADJUSTMENT",
          quantityKg: D(-14),
          createdAt: TODAY,
        },
      ],
    });
    expect(report.waxCheck?.status).toBe("UNDER");
    expect(report.waxCheck?.gapCartons).toBe("2");
    expect(report.trend.at(-1)?.producedCartons).toBe("10");
  });
});
