import { describe, expect, it } from "vitest";
import { ToSaleDTO } from "@/features/sales/validators/sale.schema";
import { Prisma } from "@/generated/prisma/client";
import { CanSeeCost, COST_PERMISSION } from "../cost-access";
import { ToProductDTO } from "../validators/product.schema";

const D = (value: number) => new Prisma.Decimal(value);
const NOW = new Date("2026-11-27T06:00:00Z");

// Default role permissions (prisma/seed.ts), trimmed to what matters here.
const INVENTORY_MANAGER = ["product:read", "sale:read", "sale:create"];
const MANAGER = ["product:read", "product:manage", COST_PERMISSION];

const product = {
  id: "p1",
  name: "Candle",
  sku: "SKU1",
  isActive: true,
  categoryId: "c1",
  category: {
    id: "c1",
    name: "Candles",
    description: null,
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
  },
  cartonSize: "NORMAL" as const,
  lowStockThresholdKg: null,
  createdAt: NOW,
  updatedAt: NOW,
  // 100/kg price and 60/kg cost = 700 and 420 per 7 kg carton.
  prices: [{ amountPerKg: D(100) }],
  costs: [{ amountPerKg: D(60) }],
  _count: { stockLedgerEntries: 0 },
} as unknown as Parameters<typeof ToProductDTO>[0];

const sale = {
  id: "s1",
  referenceCode: "S-1",
  productId: "p1",
  product,
  customerId: "cu1",
  customer: { name: "Merkato" },
  inputQuantity: D(1),
  inputUnitName: "carton",
  inputRatioToKg: D(7),
  quantityKg: D(7),
  unitPriceAtSale: D(100),
  totalAmount: D(700),
  costPerKgAtSale: D(60),
  paymentType: "CASH",
  createdById: "u1",
  createdAt: NOW,
  voidedAt: null,
  voidedById: null,
  voidReason: null,
} as unknown as Parameters<typeof ToSaleDTO>[0];

describe("CanSeeCost", () => {
  it("is false for the Inventory Manager's permissions", () => {
    expect(CanSeeCost(INVENTORY_MANAGER)).toBe(false);
  });

  it("is true with product:cost", () => {
    expect(CanSeeCost(MANAGER)).toBe(true);
  });

  it("is false with no session", () => {
    expect(CanSeeCost(undefined)).toBe(false);
  });
});

describe("ToProductDTO cost filtering", () => {
  it("leaves cost out and keeps price without product:cost", () => {
    const dto = ToProductDTO(product, CanSeeCost(INVENTORY_MANAGER));
    expect(dto.currentPrice).toBe("700");
    expect(dto.currentCost).toBeNull();
  });

  it("includes cost with product:cost", () => {
    const dto = ToProductDTO(product, CanSeeCost(MANAGER));
    expect(dto.currentPrice).toBe("700");
    expect(dto.currentCost).toBe("420");
  });
});

describe("ToSaleDTO cost filtering", () => {
  it("leaves the cost snapshot out and keeps price without product:cost", () => {
    const dto = ToSaleDTO(sale, new Map(), CanSeeCost(INVENTORY_MANAGER));
    expect(dto.costPerKgAtSale).toBeNull();
    expect(dto.pricePerCarton).toBe("700");
    expect(dto.totalAmount).toBe("700");
  });

  it("includes the cost snapshot with product:cost", () => {
    const dto = ToSaleDTO(sale, new Map(), CanSeeCost(MANAGER));
    expect(dto.costPerKgAtSale).toBe("60");
  });
});
