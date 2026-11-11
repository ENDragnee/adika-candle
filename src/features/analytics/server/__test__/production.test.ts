import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { BuildPeriodWindow } from "../periods";
import {
  ComputeProductionReport,
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
        balanceKg: D(input.productBalance ?? 0),
      },
    ],
    materialEntries: input.materialEntries ?? [],
    stockEntries: input.stockEntries ?? [],
    requirements: [],
  });
}

describe("ComputeProductionReport", () => {
  it("keeps opening + in − out ± adjustments = closing with adjustments present", () => {
    // Balance now 35 = 0 + accept 50 − sale 10 − adjustment 5.
    const report = Report({
      productBalance: 35,
      stockEntries: [
        {
          productId: "p1",
          type: "ACCEPT",
          quantityKg: D(50),
          createdAt: TODAY,
        },
        { productId: "p1", type: "SALE", quantityKg: D(-10), createdAt: TODAY },
        {
          productId: "p1",
          type: "ADJUSTMENT",
          quantityKg: D(-5),
          createdAt: TODAY,
        },
      ],
    });
    const [row] = report.products;
    expect(row.openingKg).toBe("0");
    expect(row.receivedKg).toBe("50");
    expect(row.consumedKg).toBe("10");
    expect(row.adjustedKg).toBe("-5");
    expect(row.closingKg).toBe("35");
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
    expect(report.products[0].consumedKg).toBe("0");
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
