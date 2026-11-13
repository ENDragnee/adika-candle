import { describe, expect, it } from "vitest";
import { BuildLinearScale, XLabelIndices } from "../chart-scale";

describe("BuildLinearScale", () => {
  it("rounds out to nice ticks from zero", () => {
    const scale = BuildLinearScale([0, 1050, 6050]);
    expect(scale.min).toBe(0);
    expect(scale.ticks).toEqual([0, 2000, 4000, 6000, 8000]);
    expect(scale.toFraction(4000)).toBe(0.5);
  });

  it("handles negative values", () => {
    const scale = BuildLinearScale([-12, 40]);
    expect(scale.min).toBeLessThanOrEqual(-12);
    expect(scale.ticks).toContain(0);
  });

  it("handles an all-zero series", () => {
    const scale = BuildLinearScale([0, 0]);
    expect(scale.max).toBeGreaterThan(0);
  });
});

describe("XLabelIndices", () => {
  it("always includes the first and last point", () => {
    const indices = XLabelIndices(30);
    expect(indices[0]).toBe(0);
    expect(indices.at(-1)).toBe(29);
    expect(indices).toHaveLength(5);
  });
});
