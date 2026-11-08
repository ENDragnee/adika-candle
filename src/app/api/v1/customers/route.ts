import {
  CreateCustomerInputSchema,
  CustomerListResponseSchema,
  CustomerSchema,
  ToCustomerDTO,
  WITH_LOAN_ACCOUNT_INCLUDE,
} from "@/features/customers/validators/customer.schema";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import { prisma } from "@/lib/prisma";

export const GET = CreateApiRoute({
  moduleName: "customers",
  requiresAuth: {
    status: true,
    permission: ["customer:manage", "customer:read"],
  },
  responseSchema: CustomerListResponseSchema,
  handler: async () => {
    const customers = await prisma.customer.findMany({
      include: WITH_LOAN_ACCOUNT_INCLUDE,
      orderBy: { name: "asc" },
    });
    return customers.map(ToCustomerDTO);
  },
});

export const POST = CreateApiRoute({
  moduleName: "customers",
  schema: CreateCustomerInputSchema,
  requiresAuth: { status: true, permission: "customer:manage" },
  responseSchema: CustomerSchema,
  handler: async (body) => {
    // A Customer always gets a LoanAccount at creation time (balance 0)
    // rather than lazily on first transaction — see docs/DECISIONS.md.
    const customer = await prisma.$transaction(async (tx) => {
      const created = await tx.customer.create({ data: body });
      await tx.loanAccount.create({ data: { customerId: created.id } });
      return tx.customer.findUniqueOrThrow({
        where: { id: created.id },
        include: WITH_LOAN_ACCOUNT_INCLUDE,
      });
    });
    return ToCustomerDTO(customer);
  },
});
