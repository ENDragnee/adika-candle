import {
  LoanAccountListResponseSchema,
  ToLoanAccountDTO,
} from "@/features/loans/validators/loan.schema";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import { prisma } from "@/lib/prisma";

export const GET = CreateApiRoute({
  moduleName: "loans",
  requiresAuth: { status: true, permission: "loan:manage" },
  responseSchema: LoanAccountListResponseSchema,
  handler: async () => {
    const accounts = await prisma.loanAccount.findMany({
      include: { customer: true },
      orderBy: { balance: "desc" },
    });
    return accounts.map(ToLoanAccountDTO);
  },
});
