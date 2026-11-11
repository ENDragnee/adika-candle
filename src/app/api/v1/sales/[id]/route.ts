import { NextResponse } from "next/server";
import {
  SaleSchema,
  ToSaleDTO,
  WITH_SALE_RELATIONS_INCLUDE,
} from "@/features/sales/validators/sale.schema";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import { prisma } from "@/lib/prisma";
import { LoadUserNames } from "@/lib/server/user-names";

type Params = { id: string };

export const GET = CreateApiRoute<unknown, Params>({
  moduleName: "sales",
  requiresAuth: { status: true, permission: "sale:read" },
  responseSchema: SaleSchema,
  handler: async (_body, _session, params) => {
    const sale = await prisma.sale.findUnique({
      where: { id: params?.id },
      include: WITH_SALE_RELATIONS_INCLUDE,
    });

    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    return ToSaleDTO(
      sale,
      await LoadUserNames([sale.createdById, sale.voidedById]),
    );
  },
});
