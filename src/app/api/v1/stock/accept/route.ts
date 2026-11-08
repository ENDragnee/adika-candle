import { NextResponse } from "next/server";
import {
  AcceptStockInputSchema,
  StockLedgerEntrySchema,
  ToStockLedgerEntryDTO,
} from "@/features/stock/validators/stock.schema";
import {
  convertToKg,
  UnknownUnitError,
} from "@/features/unit-conversions/services/convert-to-kg.service";
import { Prisma } from "@/generated/prisma/client";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import { prisma } from "@/lib/prisma";

export const POST = CreateApiRoute({
  moduleName: "stock.accept",
  schema: AcceptStockInputSchema,
  requiresAuth: { status: true, permission: "stock:accept" },
  responseSchema: StockLedgerEntrySchema,
  handler: async (body, session) => {
    const product = await prisma.product.findUnique({
      where: { id: body.productId },
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

    let quantityKg: number;

    try {
      quantityKg = await convertToKg(body.unitName, body.quantity);
    } catch (err) {
      if (err instanceof UnknownUnitError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }

    // Read separately from convertToKg purely to snapshot the ratio that
    // produced quantityKg — not a second conversion, see
    // docs/DECISIONS.md "Sale and StockLedgerEntry snapshot ratio/price at
    // transaction time".
    const unit = await prisma.unitConversion.findUnique({
      where: { unitName: body.unitName },
    });

    if (!unit) {
      return NextResponse.json(
        { error: `Unknown or inactive unit: ${body.unitName}` },
        { status: 400 },
      );
    }

    const ledgerEntry = await prisma.$transaction(async (tx) => {
      const existingBalance = await tx.stockBalance.findUnique({
        where: { productId: body.productId },
      });
      const balanceAfterKg = (
        existingBalance?.quantityKg ?? new Prisma.Decimal(0)
      ).plus(quantityKg);

      await tx.stockBalance.upsert({
        where: { productId: body.productId },
        create: { productId: body.productId, quantityKg: balanceAfterKg },
        update: { quantityKg: balanceAfterKg },
      });

      return tx.stockLedgerEntry.create({
        data: {
          productId: body.productId,
          type: "ACCEPT",
          quantityKg,
          balanceAfterKg,
          inputQuantity: body.quantity,
          inputUnitName: body.unitName,
          inputRatioToKg: unit.ratioToKg,
          note: body.note,
          createdById,
        },
      });
    });

    return ToStockLedgerEntryDTO(ledgerEntry);
  },
});
