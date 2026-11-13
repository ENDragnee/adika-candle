import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { BuildRangeBuckets } from "../periods";
import { ComputeProfitability, type ProfitSale } from "../profitability";

const D = (value: number) => new Prisma.Decimal(value);
// The 7 local days ending 2026-11-11.
const BUCKETS = BuildRangeBuckets("2026-11-05", "2026-11-11");

function Sale(overrides: Partial<ProfitSale>): ProfitSale {
  return {
    createdAt: new Date("2026-11-11T06:00:00Z"),
    productId: "p1",
    productName: "Candle",
    productSku: "SKU1",
    quantityKg: D(10),
    totalAmount: D(1000),
    costPerKgAtSale: D(60),
    ...overrides,
  };
}

function Compute(sales: ProfitSale[]) {
  return ComputeProfitability({
    sales,
    buckets: BUCKETS,
    currentPrices: new Map([["p1", D(100)]]),
    currentCosts: new Map([["p1", D(70)]]),
  });
}

describe("ComputeProfitability", () => {
  it("reports unknown profit, not 100% margin, when no sale has a cost", () => {
    const result = Compute([
      Sale({ costPerKgAtSale: null }),
      Sale({ costPerKgAtSale: null }),
    ]);
    expect(result.stats.totalRevenue).toBe("2000");
    expect(result.stats.totalProfit).toBeNull();
    expect(result.stats.averageMarginPercent).toBeNull();
    expect(result.stats.excludedSaleCount).toBe(2);
  });

  it("computes profit and margin over costed sales only", () => {
    // Costed: revenue 1000, cost 600 → profit 400, margin 40%.
    // Uncosted: revenue 500 → revenue only.
    const result = Compute([
      Sale({}),
      Sale({ totalAmount: D(500), costPerKgAtSale: null }),
    ]);
    expect(result.stats.totalRevenue).toBe("1500");
    expect(result.stats.costedRevenue).toBe("1000");
    expect(result.stats.totalCost).toBe("600");
    expect(result.stats.totalProfit).toBe("400");
    expect(result.stats.averageMarginPercent).toBe("40.0");
  });

  it("separates realized margin from today's price/cost margin", () => {
    const [row] = Compute([Sale({})]).products;
    expect(row.realizedMarginPercent).toBe("40.0");
    expect(row.currentMarginPercent).toBe("30.0");
  });

  it("leaves days with no sales as null margin, not 0%", () => {
    const { trend } = Compute([Sale({})]);
    expect(trend).toHaveLength(7);
    expect(trend.at(-1)?.marginPercent).toBe("40.0");
    expect(trend[0].marginPercent).toBeNull();
  });

  it("buckets a 01:30 local-time sale on its local day", () => {
    // 2026-11-10T22:30Z is 2026-11-11 01:30 in Addis Ababa.
    const { trend } = Compute([
      Sale({ createdAt: new Date("2026-11-10T22:30:00Z") }),
    ]);
    expect(trend.at(-1)?.date).toBe("2026-11-11");
    expect(trend.at(-1)?.revenue).toBe("1000");
  });
});
