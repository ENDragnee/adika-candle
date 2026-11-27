import { describe, expect, it } from "vitest";
import { ParseSaleUnitMode, SaleModeAllows } from "../flags";

describe("sale unit mode", () => {
  it("falls back to cartons for anything unknown", () => {
    expect(ParseSaleUnitMode("PACKET")).toBe("PACKET");
    expect(ParseSaleUnitMode("BOTH")).toBe("BOTH");
    expect(ParseSaleUnitMode("packet")).toBe("CARTON");
    expect(ParseSaleUnitMode(undefined)).toBe("CARTON");
    expect(ParseSaleUnitMode(3)).toBe("CARTON");
  });

  it.each([
    ["CARTON", { cartons: 2, packets: 0 }, true],
    ["CARTON", { cartons: 0, packets: 5 }, false],
    ["CARTON", { cartons: 2, packets: 5 }, false],
    ["PACKET", { cartons: 0, packets: 5 }, true],
    ["PACKET", { cartons: 2, packets: 0 }, false],
    ["PACKET", { cartons: 2, packets: 5 }, false],
    ["BOTH", { cartons: 2, packets: 0 }, true],
    ["BOTH", { cartons: 0, packets: 5 }, true],
    ["BOTH", { cartons: 2, packets: 5 }, true],
  ] as const)("%s allows %o: %s", (mode, quantity, allowed) => {
    expect(SaleModeAllows(mode, quantity)).toBe(allowed);
  });
});
