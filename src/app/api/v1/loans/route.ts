import {
  LoanAccountQuerySchema,
  LoanAccountSchema,
  ReceivablesSummarySchema,
  ToLoanAccountDTO,
} from "@/features/loans/validators/loan.schema";
import { Prisma } from "@/generated/prisma/client";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import {
  BuildPaginationMeta,
  PaginatedResponseSchema,
  PaginationQuerySchema,
  ToSkipTake,
} from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

const LoansQuerySchema = LoanAccountQuerySchema.extend(
  PaginationQuerySchema.shape,
);

const BALANCE_WHERE: Record<string, Prisma.LoanAccountWhereInput> = {
  ALL: {},
  OWES: { balance: { gt: 0 } },
  CREDIT: { balance: { lt: 0 } },
  SETTLED: { balance: { equals: 0 } },
};

// The receivables view behind /manager/loans: every customer account,
// biggest debt first, with the date of their last payment and totals for
// the whole book (not just the current page).
export const GET = CreateApiRoute({
  moduleName: "loans",
  schema: LoansQuerySchema,
  requiresAuth: { status: true, permission: "loan:manage" },
  responseSchema: PaginatedResponseSchema(LoanAccountSchema).extend({
    summary: ReceivablesSummarySchema,
  }),
  handler: async (query) => {
    const where: Prisma.LoanAccountWhereInput = {
      ...BALANCE_WHERE[query.balance],
      ...(query.search && {
        customer: { name: { contains: query.search, mode: "insensitive" } },
      }),
    };

    const [accounts, total, owed, credit] = await Promise.all([
      prisma.loanAccount.findMany({
        where,
        include: { customer: true },
        orderBy: [{ balance: "desc" }, { customer: { name: "asc" } }],
        ...ToSkipTake(query),
      }),
      prisma.loanAccount.count({ where }),
      prisma.loanAccount.aggregate({
        where: { balance: { gt: 0 } },
        _sum: { balance: true },
        _count: true,
      }),
      prisma.loanAccount.aggregate({
        where: { balance: { lt: 0 } },
        _sum: { balance: true },
        _count: true,
      }),
    ]);
    const lastPayments = await prisma.loanTransaction.groupBy({
      by: ["loanAccountId"],
      where: {
        type: "REPAYMENT_RECEIVED",
        loanAccountId: { in: accounts.map((account) => account.id) },
      },
      _max: { createdAt: true },
    });
    const lastPaymentBy = new Map(
      lastPayments.map((row) => [row.loanAccountId, row._max.createdAt]),
    );

    return {
      data: accounts.map((account) =>
        ToLoanAccountDTO(account, lastPaymentBy.get(account.id) ?? null),
      ),
      pagination: BuildPaginationMeta(query, total),
      summary: {
        owedToUs: (owed._sum.balance ?? new Prisma.Decimal(0)).toString(),
        customerCredit: (credit._sum.balance ?? new Prisma.Decimal(0))
          .negated()
          .toString(),
        debtorCount: owed._count,
        creditCount: credit._count,
      },
    };
  },
});
