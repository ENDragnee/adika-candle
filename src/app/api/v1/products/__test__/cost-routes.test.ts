import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";

// Server-side enforcement of product:cost (2026-11-27): the Inventory
// Manager gets prices but no cost from the API, and the cost endpoints
// refuse them outright.

vi.mock("@/lib/activity/record-activity", () => ({
  RecordActivity: vi.fn(),
  RequestContext: () => ({ ipAddress: null, userAgent: null }),
}));

vi.mock("@/lib/activity/names", () => ({
  ProductName: vi.fn(async () => "Candle"),
}));

let permissions: string[] = [];

vi.mock("@/lib/session", () => ({
  GetApiSession: vi.fn(async () => ({ user: { id: "u1", permissions } })),
  CheckPermission: vi.fn(async (name: string) => permissions.includes(name)),
  CheckAnyPermission: vi.fn(async (names: string[]) =>
    names.some((name) => permissions.includes(name)),
  ),
}));

const NOW = new Date("2026-11-27T06:00:00Z");
const D = (value: number) => new Prisma.Decimal(value);
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
  cartonSize: "NORMAL",
  lowStockThresholdKg: null,
  createdAt: NOW,
  updatedAt: NOW,
  prices: [{ amountPerKg: D(100) }],
  costs: [{ amountPerKg: D(60) }],
  _count: { stockLedgerEntries: 0 },
};

const prisma = {
  product: {
    findMany: vi.fn(async () => [product]),
    findUnique: vi.fn(async () => product),
    count: vi.fn(async () => 1),
  },
  cost: {
    findMany: vi.fn(async () => []),
    count: vi.fn(async () => 0),
  },
  $transaction: vi.fn(),
};

vi.mock("@/lib/prisma", () => ({ prisma }));

const productsRoute = await import("../route");
const productRoute = await import("../[id]/route");
const costsRoute = await import("../[id]/costs/route");

const INVENTORY_MANAGER = ["product:read", "sale:read", "sale:create"];
const MANAGER = ["product:read", "product:manage", "product:cost"];
const context = { params: Promise.resolve({ id: "p1" }) };

function Get(url: string) {
  return new NextRequest(`http://localhost${url}`, { method: "GET" });
}

describe("product cost access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists products with price but no cost for the Inventory Manager", async () => {
    permissions = INVENTORY_MANAGER;
    const response = await productsRoute.GET(Get("/api/v1/products"), context);
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data[0].currentPrice).toBe("700");
    expect(body.data[0].currentCost).toBeNull();
  });

  it("lists products with cost for the Manager", async () => {
    permissions = MANAGER;
    const response = await productsRoute.GET(Get("/api/v1/products"), context);
    const body = await response.json();
    expect(body.data[0].currentCost).toBe("420");
  });

  it("returns one product with no cost for the Inventory Manager", async () => {
    permissions = INVENTORY_MANAGER;
    const response = await productRoute.GET(
      Get("/api/v1/products/p1"),
      context,
    );
    const body = await response.json();
    expect(body.currentPrice).toBe("700");
    expect(body.currentCost).toBeNull();
  });

  it("refuses cost history without product:cost", async () => {
    permissions = INVENTORY_MANAGER;
    const response = await costsRoute.GET(
      Get("/api/v1/products/p1/costs"),
      context,
    );
    expect(response.status).toBe(403);
    expect(prisma.cost.findMany).not.toHaveBeenCalled();
  });

  it("refuses cost history to product:manage without product:cost", async () => {
    permissions = ["product:read", "product:manage"];
    const response = await costsRoute.GET(
      Get("/api/v1/products/p1/costs"),
      context,
    );
    expect(response.status).toBe(403);
  });

  it("serves cost history with product:cost", async () => {
    permissions = MANAGER;
    const response = await costsRoute.GET(
      Get("/api/v1/products/p1/costs"),
      context,
    );
    expect(response.status).toBe(200);
  });

  it("refuses setting a cost to product:manage without product:cost", async () => {
    permissions = ["product:read", "product:manage"];
    const response = await costsRoute.POST(
      new NextRequest("http://localhost/api/v1/products/p1/costs", {
        method: "POST",
        body: JSON.stringify({ amountPerCarton: 420 }),
      }),
      context,
    );
    expect(response.status).toBe(403);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
