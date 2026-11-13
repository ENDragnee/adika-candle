import { NextResponse } from "next/server";
import type { CreateLoanTransactionInput } from "@/features/loans/validators/loan.schema";
import {
  CreateLoanTransactionInputSchema,
  LoanTransactionSchema,
  ToLoanTransactionDTO,
} from "@/features/loans/validators/loan.schema";
import { Prisma } from "@/generated/prisma/client";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import { ApplyLoanDelta } from "@/lib/ledger-balance";
import {
  BuildPaginationMeta,
  PaginatedResponseSchema,
  type PaginationQuery,
  PaginationQuerySchema,
  ToSkipTake,
} from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { LoadUserNames } from "@/lib/server/user-names";

type Params = { accountId: string };

export const GET = CreateApiRoute<PaginationQuery, Params>({
  moduleName: "loans.transactions",
  schema: PaginationQuerySchema,
  requiresAuth: { status: true, permission: ["loan:manage", "loan:record"] },
  responseSchema: PaginatedResponseSchema(LoanTransactionSchema),
  handler: async (query, _session, params) => {
    const where = { loanAccountId: params?.accountId };

    const { skip, take } = ToSkipTake(query);
    // One extra row past the page: the entry just before the page's oldest
    // one, whose balanceAfter is the starting point for that oldest row's
    // signed change.
    const [rows, total] = await Promise.all([
      prisma.loanTransaction.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip,
        take: take + 1,
      }),
      prisma.loanTransaction.count({ where }),
    ]);
    const transactions = rows.slice(0, take);
    const userNames = await LoadUserNames(
      transactions.map((transaction) => transaction.createdById),
    );
    return {
      data: transactions.map((transaction, index) => {
        // Accounts start at 0, so the very first entry's change is its
        // own balanceAfter.
        const previousBalance =
          rows[index + 1]?.balanceAfter ?? new Prisma.Decimal(0);
        return ToLoanTransactionDTO(transaction, {
          change: transaction.balanceAfter.minus(previousBalance).toString(),
          createdByName: userNames.get(transaction.createdById) ?? null,
        });
      }),
      pagination: BuildPaginationMeta(query, total),
    };
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

    // Deliberately no isActive check: a deactivated customer can still pay
    // off what they owe, and a Manager can still correct their balance.
    // Only new sales are blocked for inactive customers (record-sale.ts).

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

    // Atomic increment — see src/lib/ledger-balance.ts for why a
    // read-then-write here could lose a concurrent posting.
    const transaction = await prisma.$transaction(async (tx) => {
      const balanceAfter = await ApplyLoanDelta(tx, accountId, delta);

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

    return ToLoanTransactionDTO(transaction, {
      change: delta.toString(),
    });
  },
});
