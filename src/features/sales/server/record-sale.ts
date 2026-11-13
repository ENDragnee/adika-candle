import {
  convertToKg,
  UnknownUnitError,
} from "@/features/unit-conversions/services/convert-to-kg.service";
import { Prisma } from "@/generated/prisma/client";
import { GenerateCode } from "@/lib/generate-code";
import { ApplyLoanDelta, ApplyStockDelta } from "@/lib/ledger-balance";
import { prisma } from "@/lib/prisma";
import { DomainError } from "@/lib/server/domain-error";
import {
  type CreateSaleInput,
  WITH_SALE_RELATIONS_INCLUDE,
} from "../validators/sale.schema";

const MAX_REFERENCE_CODE_ATTEMPTS = 5;

type Tx = Prisma.TransactionClient;

// Locks the customer's loan account row for the rest of the transaction,
// so the "how much credit do they have?" read below can't race another
// posting against the same account.
async function LockLoanAccount(tx: Tx, customerId: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM loan_account WHERE "customerId" = ${customerId} FOR UPDATE
  `;
  const id = rows[0]?.id;
  if (!id) {
    throw new DomainError("Customer has no loan account", 400, "NO_ACCOUNT");
  }
  return tx.loanAccount.findUniqueOrThrow({ where: { id } });
}

// Posts an on-account sale. If the customer has credit with us (negative
// balance, e.g. an advance they paid), the sale spends that credit first
// as ADVANCE_REDEEMED and only the remainder becomes new debt as
// SALE_ON_CREDIT. Before Epic 21 the whole amount was always
// SALE_ON_CREDIT, so spending an advance read as "went into debt".
// Both types increase the balance (toward "customer owes us").
async function PostOnAccount(
  tx: Tx,
  input: {
    customerId: string;
    saleId: string;
    totalAmount: Prisma.Decimal;
    createdById: string;
  },
) {
  const account = await LockLoanAccount(tx, input.customerId);
  const credit = account.balance.lessThan(0)
    ? Prisma.Decimal.min(input.totalAmount, account.balance.negated())
    : new Prisma.Decimal(0);
  const remainder = input.totalAmount.minus(credit);

  if (credit.greaterThan(0)) {
    const balanceAfter = await ApplyLoanDelta(tx, account.id, credit);
    await tx.loanTransaction.create({
      data: {
        loanAccountId: account.id,
        type: "ADVANCE_REDEEMED",
        amount: credit,
        balanceAfter,
        saleId: input.saleId,
        createdById: input.createdById,
      },
    });
  }

  if (remainder.greaterThan(0)) {
    const balanceAfter = await ApplyLoanDelta(tx, account.id, remainder);
    await tx.loanTransaction.create({
      data: {
        loanAccountId: account.id,
        type: "SALE_ON_CREDIT",
        amount: remainder,
        balanceAfter,
        saleId: input.saleId,
        createdById: input.createdById,
      },
    });
  }
}

export async function RecordSale(input: CreateSaleInput, createdById: string) {
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
  });
  if (!product) {
    throw new DomainError("Product not found", 404, "NOT_FOUND");
  }
  // The pickers already hide inactive products/customers; this stops a
  // stale tab or a direct API call from selling them anyway.
  if (!product.isActive) {
    throw new DomainError(
      "This product is inactive and can't be sold",
      400,
      "PRODUCT_INACTIVE",
    );
  }

  const [activePrice, activeCost, unit, customer] = await Promise.all([
    prisma.price.findFirst({
      where: { productId: input.productId, effectiveTo: null },
    }),
    // Epic 15: a missing cost doesn't block the sale — it just leaves this
    // sale out of profit/margin reports.
    prisma.cost.findFirst({
      where: { productId: input.productId, effectiveTo: null },
    }),
    prisma.unitConversion.findUnique({
      where: { unitName: input.inputUnitName },
    }),
    input.customerId
      ? prisma.customer.findUnique({ where: { id: input.customerId } })
      : Promise.resolve(null),
  ]);

  if (!activePrice) {
    throw new DomainError(
      "This product has no price yet — set one before selling it",
      400,
      "NO_PRICE",
    );
  }
  if (input.customerId && !customer) {
    throw new DomainError("Customer not found", 404, "NOT_FOUND");
  }
  if (customer && !customer.isActive) {
    throw new DomainError(
      "This customer is inactive",
      400,
      "CUSTOMER_INACTIVE",
    );
  }

  let quantityKgNumber: number;
  try {
    quantityKgNumber = await convertToKg(
      input.inputUnitName,
      input.inputQuantity,
    );
  } catch (err) {
    if (err instanceof UnknownUnitError) {
      throw new DomainError(err.message, 400, "UNKNOWN_UNIT");
    }
    throw err;
  }
  if (!unit) {
    throw new DomainError(
      `Unknown or inactive unit: ${input.inputUnitName}`,
      400,
      "UNKNOWN_UNIT",
    );
  }

  const quantityKg = new Prisma.Decimal(quantityKgNumber);
  const totalAmount = quantityKg.times(activePrice.amountPerKg);

  // Re-runs the whole transaction on a referenceCode collision — see
  // docs/DECISIONS.md, "Epic 6 decisions".
  for (let attempt = 0; attempt < MAX_REFERENCE_CODE_ATTEMPTS; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        if (!input.allowOversell) {
          const balance = await tx.stockBalance.findUnique({
            where: { productId: input.productId },
          });
          const available = balance?.quantityKg ?? new Prisma.Decimal(0);
          if (available.lessThan(quantityKg)) {
            throw new DomainError(
              "Not enough stock on hand for this sale",
              409,
              "INSUFFICIENT_STOCK",
              {
                availableKg: available.toString(),
                requestedKg: quantityKg.toString(),
              },
            );
          }
        }

        const referenceCode = GenerateCode();
        if (!referenceCode) {
          throw new Error("Failed to generate a sale reference code");
        }

        const sale = await tx.sale.create({
          data: {
            referenceCode,
            productId: input.productId,
            customerId: customer?.id ?? null,
            inputQuantity: input.inputQuantity,
            inputUnitName: input.inputUnitName,
            inputRatioToKg: unit.ratioToKg,
            quantityKg,
            unitPriceAtSale: activePrice.amountPerKg,
            totalAmount,
            costPerKgAtSale: activeCost?.amountPerKg ?? null,
            paymentType: input.paymentType,
            createdById,
          },
        });

        const balanceAfterKg = await ApplyStockDelta(
          tx,
          input.productId,
          quantityKg.negated(),
        );
        await tx.stockLedgerEntry.create({
          data: {
            productId: input.productId,
            type: "SALE",
            quantityKg: quantityKg.negated(),
            balanceAfterKg,
            inputQuantity: input.inputQuantity,
            inputUnitName: input.inputUnitName,
            inputRatioToKg: unit.ratioToKg,
            saleId: sale.id,
            createdById,
          },
        });

        if (input.paymentType === "LOAN") {
          await PostOnAccount(tx, {
            customerId: input.customerId,
            saleId: sale.id,
            totalAmount,
            createdById,
          });
        }

        return tx.sale.findUniqueOrThrow({
          where: { id: sale.id },
          include: WITH_SALE_RELATIONS_INCLUDE,
        });
      });
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

  throw new Error("Unreachable: reference-code retry loop exhausted");
}
