import { describe, expect, it } from "vitest";
import {
  CartonsToKg,
  FormatPacking,
  FormatPackingBreakdown,
  FormatSaleQuantity,
  FormatSaleUnits,
  KgToCartons,
  PackingToCartons,
  SplitPacking,
} from "../packing";

describe("packing", () => {
  it("uses 7 kg Normal and 8.5 kg Plus cartons", () => {
    expect(CartonsToKg(200, "NORMAL")).toBe(1400);
    expect(CartonsToKg(10, "PLUS")).toBe(85);
    expect(KgToCartons(85, "PLUS")).toBe(10);
  });

  it("splits cartons into cartons, packets and pieces", () => {
    // 12 cartons + 15 packets + 3 pieces.
    const cartons = 12 + 15 / 30 + 3 / 240;
    expect(SplitPacking(cartons)).toEqual({
      negative: false,
      cartons: 12,
      packets: 15,
      pieces: 3,
    });
    expect(FormatPackingBreakdown(cartons)).toBe("12 ctn · 15 pkt · 3 pcs");
  });

  it("keeps a negative balance readable", () => {
    expect(FormatPackingBreakdown(-2.5)).toBe("−2 ctn · 15 pkt");
    expect(FormatPackingBreakdown(0)).toBe("0 ctn");
  });

  it("converts to packets and pieces", () => {
    expect(FormatPacking(2, "PACKET")).toBe("60 pkt");
    expect(FormatPacking(2, "PIECE")).toBe("480 pcs");
    expect(FormatPacking(1.5, "CARTON", { signed: true })).toBe("+1.5 ctn");
  });

  it("adds counted packets and pieces back up to cartons", () => {
    expect(PackingToCartons({ cartons: 1, packets: 30, pieces: 240 })).toBe(3);
  });
});

describe("sale quantities", () => {
  const packetSale = { cartons: 1.5, inputUnitName: "PACKET" };
  const cartonSale = { cartons: 2.5, inputUnitName: "CARTON" };

  it("reads packet sales in packets when selling by packet", () => {
    expect(FormatSaleQuantity(packetSale, "PACKET")).toBe("45 pkt");
    expect(FormatSaleUnits(0.4, "PACKET")).toBe("12 pkt");
  });

  it("reads packet sales as cartons + packets otherwise", () => {
    expect(FormatSaleQuantity(packetSale, "BOTH")).toBe("1 ctn · 15 pkt");
    expect(FormatSaleQuantity(packetSale, "CARTON")).toBe("1 ctn · 15 pkt");
  });

  it("keeps carton sales as they were recorded in every mode", () => {
    expect(FormatSaleQuantity(cartonSale, "CARTON")).toBe("2.5 ctn");
    expect(FormatSaleQuantity(cartonSale, "PACKET")).toBe("2.5 ctn");
    expect(FormatSaleQuantity(cartonSale, "BOTH")).toBe("2.5 ctn");
  });
});
