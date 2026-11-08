import {
  LoanAccountSchema,
  ToLoanAccountDTO,
} from "@/features/loans/validators/loan.schema";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import {
  BuildPaginationMeta,
  PaginatedResponseSchema,
  PaginationQuerySchema,
  ToSkipTake,
} from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

export const GET = CreateApiRoute({
  moduleName: "loans",
  schema: PaginationQuerySchema,
  requiresAuth: { status: true, permission: "loan:manage" },
  responseSchema: PaginatedResponseSchema(LoanAccountSchema),
  handler: async (query) => {
    const [accounts, total] = await Promise.all([
      prisma.loanAccount.findMany({
        include: { customer: true },
        orderBy: { balance: "desc" },
        ...ToSkipTake(query),
      }),
      prisma.loanAccount.count(),
    ]);
    return {
      data: accounts.map(ToLoanAccountDTO),
      pagination: BuildPaginationMeta(query, total),
    };
  },
});
