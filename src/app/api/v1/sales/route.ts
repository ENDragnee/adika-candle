import { RecordSale } from "@/features/sales/server/record-sale";
import {
  CreateSaleInputSchema,
  SaleQuerySchema,
  SaleSchema,
  SalesSummarySchema,
  ToSaleDTO,
  WITH_SALE_RELATIONS_INCLUDE,
} from "@/features/sales/validators/sale.schema";
import { Prisma } from "@/generated/prisma/client";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import { AddBusinessDays, StartOfBusinessDate } from "@/lib/business-time";
import { CartonsFromKg } from "@/lib/carton-decimal";
import { FormatSaleQuantity } from "@/lib/packing";
import {
  BuildPaginationMeta,
  PaginatedResponseSchema,
  PaginationQuerySchema,
  ToSkipTake,
} from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { LoadUserNames } from "@/lib/server/user-names";

const SalesQuerySchema = SaleQuerySchema.extend(PaginationQuerySchema.shape);

function BuildWhere(
  query: ReturnType<typeof SalesQuerySchema.parse>,
): Prisma.SaleWhereInput {
  const createdAt: Prisma.DateTimeFilter = {};
  if (query.from) createdAt.gte = StartOfBusinessDate(query.from);
  if (query.to)
    createdAt.lt = AddBusinessDays(StartOfBusinessDate(query.to), 1);

  return {
    ...(query.createdById && { createdById: query.createdById }),
    ...(query.productId && { productId: query.productId }),
    ...(query.customerId && { customerId: query.customerId }),
    ...(query.paymentType && { paymentType: query.paymentType }),
    ...(query.search && {
      referenceCode: { contains: query.search, mode: "insensitive" as const },
    }),
    ...((query.from || query.to) && { createdAt }),
    ...(query.status === "ACTIVE" && { voidedAt: null }),
    ...(query.status === "VOIDED" && { voidedAt: { not: null } }),
  };
}

export const GET = CreateApiRoute({
  moduleName: "sales",
  schema: SalesQuerySchema,
  requiresAuth: { status: true, permission: "sale:read" },
  responseSchema: PaginatedResponseSchema(SaleSchema).extend({
    summary: SalesSummarySchema,
  }),
  handler: async (query) => {
    const where = BuildWhere(query);
    // Totals always describe live sales — a voided sale never counts as
    // money taken, even when the list is showing voided rows.
    const summaryWhere: Prisma.SaleWhereInput = {
      AND: [where, { voidedAt: null }],
    };

    const [sales, total, totals, byPayment, byProduct] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: WITH_SALE_RELATIONS_INCLUDE,
        orderBy: { createdAt: "desc" },
        ...ToSkipTake(query),
      }),
      prisma.sale.count({ where }),
      prisma.sale.aggregate({
        where: summaryWhere,
        _count: true,
        _sum: { totalAmount: true },
      }),
      prisma.sale.groupBy({
        by: ["paymentType"],
        where: summaryWhere,
        _sum: { totalAmount: true },
      }),
      // Cartons are per product (a Plus carton is heavier), so the kg total
      // is split by product before converting.
      prisma.sale.groupBy({
        by: ["productId"],
        where: summaryWhere,
        _sum: { quantityKg: true },
      }),
    ]);
    const sizes = await prisma.product.findMany({
      where: { id: { in: byProduct.map((row) => row.productId) } },
      select: { id: true, cartonSize: true },
    });
    const sizeOf = new Map(sizes.map((row) => [row.id, row.cartonSize]));
    const totalCartons = byProduct.reduce(
      (sum, row) =>
        sum.plus(
          CartonsFromKg(
            row._sum.quantityKg ?? new Prisma.Decimal(0),
            sizeOf.get(row.productId) ?? "NORMAL",
          ),
        ),
      new Prisma.Decimal(0),
    );
    const userNames = await LoadUserNames(
      sales.flatMap((sale) => [sale.createdById, sale.voidedById]),
    );
    const SumFor = (type: "CASH" | "LOAN") =>
      (
        byPayment.find((row) => row.paymentType === type)?._sum.totalAmount ??
        new Prisma.Decimal(0)
      ).toString();

    return {
      data: sales.map((sale) => ToSaleDTO(sale, userNames)),
      pagination: BuildPaginationMeta(query, total),
      summary: {
        saleCount: totals._count,
        totalCartons: totalCartons.toString(),
        totalAmount: (totals._sum.totalAmount ?? 0).toString(),
        cashAmount: SumFor("CASH"),
        onAccountAmount: SumFor("LOAN"),
      },
    };
  },
});

export const POST = CreateApiRoute({
  moduleName: "sales",
  schema: CreateSaleInputSchema,
  requiresAuth: { status: true, permission: "sale:create" },
  responseSchema: SaleSchema,
  activity: ({ result }) => ({
    type: "sales",
    action: "sale.create",
    message: `Sold ${FormatSaleQuantity(result, "BOTH")} of ${result.productName} for ETB ${result.totalAmount}${result.customerName ? ` to ${result.customerName}` : ""}${result.paymentType === "LOAN" ? " on account" : ""}`,
    entityType: "sale",
    entityId: result.id,
    entityLabel: result.referenceCode,
    changes: {
      product: result.productName,
      cartons: result.cartons,
      ...(result.inputUnitName === "PACKET" && {
        packets: result.inputQuantity,
      }),
      totalAmount: result.totalAmount,
      paymentType: result.paymentType,
      customer: result.customerName,
    },
  }),
  handler: async (body, session) => {
    // requiresAuth.status guarantees a session id here.
    const createdById = session?.id ?? "";
    const sale = await RecordSale(body, createdById);
    return ToSaleDTO(sale, await LoadUserNames([sale.createdById]));
  },
});
