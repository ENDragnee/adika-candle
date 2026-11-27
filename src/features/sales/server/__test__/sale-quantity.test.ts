import { describe, expect, it } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { DomainError } from "@/lib/server/domain-error";
import { CreateSaleInputSchema } from "../../validators/sale.schema";
import { AssertSaleUnitsAllowed, SaleQuantity } from "../sale-quantity";

describe("SaleQuantity", () => {
  it("keeps carton sales exactly as before", () => {
    const result = SaleQuantity({ cartons: 3, packets: 0 }, "NORMAL");
    expect(result.inputUnitName).toBe("CARTON");
    expect(result.inputQuantity.toString()).toBe("3");
    expect(result.inputRatioToKg.toString()).toBe("7");
    expect(result.quantityKg.toString()).toBe("21");
  });

  it("works packets out from the whole count", () => {
    // 45 packets of Normal = 1.5 cartons = 10.5 kg.
    const result = SaleQuantity({ cartons: 0, packets: 45 }, "NORMAL");
    expect(result.inputUnitName).toBe("PACKET");
    expect(result.inputQuantity.toString()).toBe("45");
    expect(result.quantityKg.toString()).toBe("10.5");
    expect(result.inputRatioToKg.toString()).toBe("0.233333333333");
  });

  it("snapshots a mixed sale as total packets", () => {
    // 2 cartons + 5 packets of Plus = 65 packets = 65 × 8.5 ÷ 30 kg.
    const result = SaleQuantity({ cartons: 2, packets: 5 }, "PLUS");
    expect(result.inputUnitName).toBe("PACKET");
    expect(result.inputQuantity.toString()).toBe("65");
    expect(result.quantityKg.toString()).toBe("18.416666666667");
  });

  it("adds single packets back up to a whole carton", () => {
    const one = SaleQuantity({ cartons: 0, packets: 1 }, "NORMAL").quantityKg;
    const rest = SaleQuantity({ cartons: 0, packets: 29 }, "NORMAL").quantityKg;
    expect(one.plus(rest).toString()).toBe("7");
  });

  it("prices packets at the carton price ÷ 30", () => {
    // 1,050 per Normal carton = 150 per kg; 45 packets = 1,575.
    const { quantityKg } = SaleQuantity({ cartons: 0, packets: 45 }, "NORMAL");
    const total = quantityKg.times(new Prisma.Decimal(150)).toDecimalPlaces(2);
    expect(total.toString()).toBe("1575");
  });
});

describe("AssertSaleUnitsAllowed", () => {
  it("rejects units the mode turns off", () => {
    expect(() =>
      AssertSaleUnitsAllowed("CARTON", { cartons: 0, packets: 3 }),
    ).toThrow(DomainError);
    expect(() =>
      AssertSaleUnitsAllowed("PACKET", { cartons: 1, packets: 0 }),
    ).toThrow(/packets only/);
    expect(() =>
      AssertSaleUnitsAllowed("BOTH", { cartons: 1, packets: 3 }),
    ).not.toThrow();
  });
});

describe("CreateSaleInputSchema", () => {
  const base = { productId: "p", customerId: "c", paymentType: "CASH" };

  it("still accepts a cartons-only body", () => {
    const parsed = CreateSaleInputSchema.parse({ ...base, cartons: 2 });
    expect(parsed).toMatchObject({ cartons: 2, packets: 0 });
  });

  it("needs some quantity", () => {
    expect(CreateSaleInputSchema.safeParse(base).success).toBe(false);
    expect(
      CreateSaleInputSchema.safeParse({ ...base, cartons: 0, packets: 0 })
        .success,
    ).toBe(false);
  });

  it("takes whole packets only", () => {
    expect(
      CreateSaleInputSchema.safeParse({ ...base, packets: 2.5 }).success,
    ).toBe(false);
    expect(
      CreateSaleInputSchema.safeParse({ ...base, packets: 7 }).success,
    ).toBe(true);
  });
});
