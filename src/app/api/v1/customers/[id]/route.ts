import { NextResponse } from "next/server";
import type {
  CustomerDTO,
  UpdateCustomerInput,
} from "@/features/customers/validators/customer.schema";
import {
  CustomerSchema,
  ToCustomerDTO,
  UpdateCustomerInputSchema,
  WITH_LOAN_ACCOUNT_INCLUDE,
} from "@/features/customers/validators/customer.schema";
import { Prisma } from "@/generated/prisma/client";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import { prisma } from "@/lib/prisma";

type Params = { id: string };

export const GET = CreateApiRoute<unknown, Params, CustomerDTO>({
  moduleName: "customers",
  requiresAuth: {
    status: true,
    permission: ["customer:manage", "customer:read"],
  },
  responseSchema: CustomerSchema,
  handler: async (_body, _session, params) => {
    const customer = await prisma.customer.findUnique({
      where: { id: params?.id },
      include: WITH_LOAN_ACCOUNT_INCLUDE,
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 },
      );
    }

    return ToCustomerDTO(customer);
  },
});

export const PATCH = CreateApiRoute<UpdateCustomerInput, Params, CustomerDTO>({
  moduleName: "customers",
  schema: UpdateCustomerInputSchema,
  requiresAuth: { status: true, permission: "customer:manage" },
  responseSchema: CustomerSchema,
  handler: async (body, _session, params) => {
    try {
      const customer = await prisma.customer.update({
        where: { id: params?.id },
        data: body,
        include: WITH_LOAN_ACCOUNT_INCLUDE,
      });
      return ToCustomerDTO(customer);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2025"
      ) {
        return NextResponse.json(
          { error: "Customer not found" },
          { status: 404 },
        );
      }
      throw err;
    }
  },
});
