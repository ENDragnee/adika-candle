import { describe, expect, it } from "vitest";
import { ClassifyStock, NeedsStockAttention } from "../stock-status";

describe("ClassifyStock", () => {
  it("flags negative balances separately from empty ones", () => {
    expect(ClassifyStock(-10, 5)).toBe("NEGATIVE");
    expect(ClassifyStock(-10, null)).toBe("NEGATIVE");
    expect(ClassifyStock(0, 5)).toBe("OUT_OF_STOCK");
    expect(ClassifyStock(0, null)).toBe("OUT_OF_STOCK");
  });

  it("reports stocked products with no threshold as untracked, not healthy", () => {
    expect(ClassifyStock(40, null)).toBe("UNTRACKED");
  });

  it("buckets against the threshold", () => {
    expect(ClassifyStock(2, 10)).toBe("CRITICAL");
    expect(ClassifyStock(7, 10)).toBe("LOW");
    expect(ClassifyStock(10, 10)).toBe("HEALTHY");
    expect(ClassifyStock(30, 10)).toBe("HEALTHY");
    expect(ClassifyStock(31, 10)).toBe("OVERSTOCKED");
  });

  it("only asks for attention on problem statuses", () => {
    expect(NeedsStockAttention("NEGATIVE")).toBe(true);
    expect(NeedsStockAttention("LOW")).toBe(true);
    expect(NeedsStockAttention("UNTRACKED")).toBe(false);
    expect(NeedsStockAttention("OVERSTOCKED")).toBe(false);
  });
});
