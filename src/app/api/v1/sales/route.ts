import { NextResponse } from "next/server";
import {
  CreateSaleInputSchema,
  SaleListResponseSchema,
  SaleQuerySchema,
  SaleSchema,
  ToSaleDTO,
  WITH_SALE_RELATIONS_INCLUDE,
} from "@/features/sales/validators/sale.schema";
import {
  convertToKg,
  UnknownUnitError,
} from "@/features/unit-conversions/services/convert-to-kg.service";
import { Prisma } from "@/generated/prisma/client";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import { GenerateCode } from "@/lib/generate-code";
import { prisma } from "@/lib/prisma";

const MAX_REFERENCE_CODE_ATTEMPTS = 5;

function GenerateSaleReferenceCode(): string {
  const code = GenerateCode();

  if (!code) {
    throw new Error("Failed to generate a sale reference code");
  }

  return code;
}

export const GET = CreateApiRoute({
  moduleName: "sales",
  schema: SaleQuerySchema,
  requiresAuth: { status: true, permission: "sale:read" },
  responseSchema: SaleListResponseSchema,
  handler: async (query) => {
    const sales = await prisma.sale.findMany({
      where: query.createdById ? { createdById: query.createdById } : undefined,
      include: WITH_SALE_RELATIONS_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    return sales.map(ToSaleDTO);
  },
});

export const POST = CreateApiRoute({
  moduleName: "sales",
  schema: CreateSaleInputSchema,
  requiresAuth: { status: true, permission: "sale:create" },
  responseSchema: SaleSchema,
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

    const activePrice = await prisma.price.findFirst({
      where: { productId: body.productId, effectiveTo: null },
    });

    if (!activePrice) {
      return NextResponse.json(
        { error: "Product has no active price" },
        { status: 400 },
      );
    }

    let quantityKg: number;

    try {
      quantityKg = await convertToKg(body.inputUnitName, body.inputQuantity);
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
      where: { unitName: body.inputUnitName },
    });

    if (!unit) {
      return NextResponse.json(
        { error: `Unknown or inactive unit: ${body.inputUnitName}` },
        { status: 400 },
      );
    }

    let customer: { id: string } | null = null;

    if (body.customerId) {
      customer = await prisma.customer.findUnique({
        where: { id: body.customerId },
        select: { id: true },
      });

      if (!customer) {
        return NextResponse.json(
          { error: "Customer not found" },
          { status: 404 },
        );
      }
    }

    const totalAmount = new Prisma.Decimal(quantityKg).times(
      activePrice.amountPerKg,
    );

    // The whole sale (Sale row + stock ledger/balance + optional loan
    // transaction) must commit atomically, so the referenceCode
    // collision-retry loop re-runs the *entire* $transaction per attempt
    // rather than just the create — a P2002 inside an interactive
    // transaction poisons the rest of that transaction on Postgres, so
    // retrying only the inner create (the product.sku pattern, which has
    // no surrounding transaction) wouldn't work here. Each failed attempt
    // rolls back cleanly and the next attempt re-reads balances fresh.
    for (let attempt = 0; attempt < MAX_REFERENCE_CODE_ATTEMPTS; attempt++) {
      try {
        const sale = await prisma.$transaction(async (tx) => {
          const createdSale = await tx.sale.create({
            data: {
              referenceCode: GenerateSaleReferenceCode(),
              productId: body.productId,
              customerId: customer?.id ?? null,
              inputQuantity: body.inputQuantity,
              inputUnitName: body.inputUnitName,
              inputRatioToKg: unit.ratioToKg,
              quantityKg,
              unitPriceAtSale: activePrice.amountPerKg,
              totalAmount,
              paymentType: body.paymentType,
              createdById,
            },
          });

          const existingBalance = await tx.stockBalance.findUnique({
            where: { productId: body.productId },
          });
          const stockBalanceAfterKg = (
            existingBalance?.quantityKg ?? new Prisma.Decimal(0)
          ).minus(quantityKg);

          await tx.stockBalance.upsert({
            where: { productId: body.productId },
            create: {
              productId: body.productId,
              quantityKg: stockBalanceAfterKg,
            },
            update: { quantityKg: stockBalanceAfterKg },
          });

          await tx.stockLedgerEntry.create({
            data: {
              productId: body.productId,
              type: "SALE",
              quantityKg: new Prisma.Decimal(quantityKg).times(-1),
              balanceAfterKg: stockBalanceAfterKg,
              inputQuantity: body.inputQuantity,
              inputUnitName: body.inputUnitName,
              inputRatioToKg: unit.ratioToKg,
              saleId: createdSale.id,
              createdById,
            },
          });

          if (body.paymentType === "LOAN") {
            // Re-read inside the transaction (not a value fetched earlier)
            // so a concurrent write can't produce a stale balanceAfter
            // snapshot — same pattern as the loan-transactions route.
            const loanAccount = await tx.loanAccount.findUniqueOrThrow({
              where: { customerId: body.customerId },
            });
            // SALE_ON_CREDIT increases balance — the customer now owes
            // more. Positive balance = customer owes the business. See
            // docs/DECISIONS.md.
            const loanBalanceAfter = loanAccount.balance.plus(totalAmount);

            await tx.loanAccount.update({
              where: { id: loanAccount.id },
              data: { balance: loanBalanceAfter },
            });

            await tx.loanTransaction.create({
              data: {
                loanAccountId: loanAccount.id,
                type: "SALE_ON_CREDIT",
                amount: totalAmount,
                balanceAfter: loanBalanceAfter,
                saleId: createdSale.id,
                createdById,
              },
            });
          }

          return tx.sale.findUniqueOrThrow({
            where: { id: createdSale.id },
            include: WITH_SALE_RELATIONS_INCLUDE,
          });
        });

        return ToSaleDTO(sale);
      } catch (err) {
        const isReferenceCodeCollision =
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002";

        if (
          !isReferenceCodeCollision ||
          attempt === MAX_REFERENCE_CODE_ATTEMPTS - 1
        ) {
          throw err;
        }
      }
    }

    // Unreachable — the loop above always returns or throws.
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  },
});
