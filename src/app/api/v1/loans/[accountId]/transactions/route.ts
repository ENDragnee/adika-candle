import { NextResponse } from "next/server";
import type { CreateLoanTransactionInput } from "@/features/loans/validators/loan.schema";
import {
  CreateLoanTransactionInputSchema,
  LoanTransactionListResponseSchema,
  LoanTransactionSchema,
  ToLoanTransactionDTO,
} from "@/features/loans/validators/loan.schema";
import { Prisma } from "@/generated/prisma/client";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import { prisma } from "@/lib/prisma";

type Params = { accountId: string };

export const GET = CreateApiRoute<unknown, Params>({
  moduleName: "loans.transactions",
  requiresAuth: { status: true, permission: ["loan:manage", "loan:record"] },
  responseSchema: LoanTransactionListResponseSchema,
  handler: async (_body, _session, params) => {
    const transactions = await prisma.loanTransaction.findMany({
      where: { loanAccountId: params?.accountId },
      orderBy: { createdAt: "desc" },
    });
    return transactions.map(ToLoanTransactionDTO);
  },
});

export const POST = CreateApiRoute<CreateLoanTransactionInput, Params>({
  moduleName: "loans.transactions",
  schema: CreateLoanTransactionInputSchema,
  requiresAuth: { status: true, permission: ["loan:manage", "loan:record"] },
  responseSchema: LoanTransactionSchema,
  handler: async (body, session, params) => {
    // Route-level auth above only confirms loan:record OR loan:manage —
    // MANUAL_ADJUSTMENT is a Manager-only correction and needs the
    // stricter check here, since it's the same handler as the two
    // either-role types (REPAYMENT_RECEIVED, ADVANCE_FROM_CUSTOMER). See
    // docs/epics/05-customers-loans.md.
    if (
      body.type === "MANUAL_ADJUSTMENT" &&
      !session?.permissions?.includes("loan:manage")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const accountId = params?.accountId;

    if (!accountId) {
      return NextResponse.json(
        { error: "Loan account not found" },
        { status: 404 },
      );
    }

    const account = await prisma.loanAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Loan account not found" },
        { status: 404 },
      );
    }

    // requiresAuth.status guarantees a session with an id by the time the
    // handler runs — see CreateApiRoute's 401 check.
    const createdById = session?.id;

    if (!createdById) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // REPAYMENT_RECEIVED and ADVANCE_FROM_CUSTOMER both always decrease
    // the balance — direction is implied by type. MANUAL_ADJUSTMENT's
    // direction is explicit on the input. See docs/DECISIONS.md.
    const delta =
      body.type === "MANUAL_ADJUSTMENT"
        ? new Prisma.Decimal(body.amount).times(
            body.direction === "INCREASE" ? 1 : -1,
          )
        : new Prisma.Decimal(body.amount).times(-1);

    const transaction = await prisma.$transaction(async (tx) => {
      // Re-read inside the transaction (not the `account` fetched above)
      // so a concurrent write can't produce a stale balanceAfter snapshot
      // — same pattern as StockLedgerEntry's balanceAfterKg.
      const current = await tx.loanAccount.findUniqueOrThrow({
        where: { id: accountId },
      });
      const balanceAfter = current.balance.plus(delta);

      await tx.loanAccount.update({
        where: { id: accountId },
        data: { balance: balanceAfter },
      });

      return tx.loanTransaction.create({
        data: {
          loanAccountId: accountId,
          type: body.type,
          amount: body.amount,
          balanceAfter,
          note: body.note,
          createdById,
        },
      });
    });

    return ToLoanTransactionDTO(transaction);
  },
});
