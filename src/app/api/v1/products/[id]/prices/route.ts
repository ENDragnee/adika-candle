import { NextResponse } from "next/server";
import type { SetNewPriceInput } from "@/features/products/validators/price.schema";
import {
  PriceListResponseSchema,
  PriceSchema,
  SetNewPriceInputSchema,
  ToPriceDTO,
} from "@/features/products/validators/price.schema";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import { prisma } from "@/lib/prisma";

type Params = { id: string };

export const GET = CreateApiRoute<unknown, Params>({
  moduleName: "products.prices",
  requiresAuth: { status: true, permission: "product:read" },
  responseSchema: PriceListResponseSchema,
  handler: async (_body, _session, params) => {
    const prices = await prisma.price.findMany({
      where: { productId: params?.id },
      orderBy: { effectiveFrom: "desc" },
    });
    return prices.map(ToPriceDTO);
  },
});

export const POST = CreateApiRoute<SetNewPriceInput, Params>({
  moduleName: "products.prices",
  schema: SetNewPriceInputSchema,
  requiresAuth: { status: true, permission: "product:manage" },
  responseSchema: PriceSchema,
  handler: async (body, session, params) => {
    const productId = params?.id;

    if (!productId) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // requiresAuth.status guarantees a session with an id by the time the
    // handler runs — see CreateApiRoute's 401 check.
    const createdById = session?.id;

    if (!createdById) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Close the prior active price and insert the new one in the same
    // transaction — never mutate an existing row's amountPerKg, per
    // docs/epics/02-categories-products-pricing.md.
    const price = await prisma.$transaction(async (tx) => {
      const now = new Date();

      await tx.price.updateMany({
        where: { productId, effectiveTo: null },
        data: { effectiveTo: now },
      });

      return tx.price.create({
        data: {
          productId,
          amountPerKg: body.amountPerKg,
          effectiveFrom: now,
          createdById,
        },
      });
    });

    return ToPriceDTO(price);
  },
});
