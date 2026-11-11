import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { ComputeStockHealth } from "../stock-health";

const Row = (quantityKg: number, thresholdKg: number | null, soldKg = 0) => ({
  productId: `p${quantityKg}`,
  productName: "Candle",
  productSku: "S",
  quantityKg,
  thresholdKg,
  soldKg,
});

describe("ComputeStockHealth", () => {
  it("never reports negative days of cover", () => {
    const { rows } = ComputeStockHealth([Row(-10, 5, 60)]);
    expect(rows[0].status).toBe("NEGATIVE");
    expect(rows[0].daysOfCover).toBeNull();
  });

  it("computes days of cover from velocity", () => {
    // 60 kg over 30 days = 2 kg/day; 20 kg on hand = 10 days.
    const { rows } = ComputeStockHealth([Row(20, 5, 60)]);
    expect(rows[0].daysOfCover).toBe("10.0");
  });

  it("counts every status in the distribution", () => {
    const { distribution } = ComputeStockHealth([
      Row(-1, null),
      Row(0, null),
      Row(5, null),
    ]);
    const counts = Object.fromEntries(
      distribution.map((bucket) => [bucket.status, bucket.count]),
    );
    expect(counts).toMatchObject({
      NEGATIVE: 1,
      OUT_OF_STOCK: 1,
      UNTRACKED: 1,
    });
  });
});
