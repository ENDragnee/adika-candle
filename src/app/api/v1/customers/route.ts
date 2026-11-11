import {
  CreateCustomerInputSchema,
  CustomerQuerySchema,
  CustomerSchema,
  ToCustomerDTO,
  WITH_LOAN_ACCOUNT_INCLUDE,
} from "@/features/customers/validators/customer.schema";
import type { Prisma } from "@/generated/prisma/client";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import {
  BuildPaginationMeta,
  PaginatedResponseSchema,
  PaginationQuerySchema,
  ToSkipTake,
} from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

const CustomersQuerySchema = CustomerQuerySchema.extend(
  PaginationQuerySchema.shape,
);

export const GET = CreateApiRoute({
  moduleName: "customers",
  schema: CustomersQuerySchema,
  requiresAuth: {
    status: true,
    permission: ["customer:manage", "customer:read"],
  },
  responseSchema: PaginatedResponseSchema(CustomerSchema),
  handler: async (query) => {
    const where: Prisma.CustomerWhereInput | undefined = query.search
      ? { name: { contains: query.search, mode: "insensitive" } }
      : undefined;

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: WITH_LOAN_ACCOUNT_INCLUDE,
        orderBy: { name: "asc" },
        ...ToSkipTake(query),
      }),
      prisma.customer.count({ where }),
    ]);
    return {
      data: customers.map(ToCustomerDTO),
      pagination: BuildPaginationMeta(query, total),
    };
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
