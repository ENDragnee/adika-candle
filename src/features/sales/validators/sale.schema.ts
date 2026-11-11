import { z } from "zod";
import type { Customer, Product, Sale } from "@/generated/prisma/client";

export const SalePaymentTypeSchema = z.enum(["CASH", "LOAN"]);

export const SaleSchema = z.object({
  id: z.string(),
  referenceCode: z.string(),
  productId: z.string(),
  productName: z.string(),
  productSku: z.string(),
  customerId: z.string().nullable(),
  customerName: z.string().nullable(),
  inputQuantity: z.string(),
  inputUnitName: z.string(),
  inputRatioToKg: z.string(),
  quantityKg: z.string(),
  unitPriceAtSale: z.string(),
  totalAmount: z.string(),
  // Snapshot of the active Cost.amountPerKg at sale time (Epic 15); null if
  // no Cost had ever been set for this product. Margin isn't computable for
  // that one sale — not an error, never backfilled.
  costPerKgAtSale: z.string().nullable(),
  paymentType: SalePaymentTypeSchema,
  createdById: z.string(),
  // Display name of the user who recorded it; null if that user was
  // since deleted.
  createdByName: z.string().nullable(),
  createdAt: z.iso.datetime(),
  // Void, never delete (Epic 21) — null on a live sale.
  voidedAt: z.iso.datetime().nullable(),
  voidedByName: z.string().nullable(),
  voidReason: z.string().nullable(),
});

export type SaleDTO = z.infer<typeof SaleSchema>;

export const SaleListResponseSchema = z.array(SaleSchema);

type SaleWithRelations = Sale & { product: Product; customer: Customer | null };

// User id → display name, looked up once per response (Sale.createdById
// isn't a Prisma relation — see LoadUserNames).
export type UserNameMap = Map<string, string>;

export function ToSaleDTO(
  sale: SaleWithRelations,
  userNames: UserNameMap = new Map(),
): SaleDTO {
  return {
    id: sale.id,
    referenceCode: sale.referenceCode,
    productId: sale.productId,
    productName: sale.product.name,
    productSku: sale.product.sku,
    customerId: sale.customerId,
    customerName: sale.customer?.name ?? null,
    inputQuantity: sale.inputQuantity.toString(),
    inputUnitName: sale.inputUnitName,
    inputRatioToKg: sale.inputRatioToKg.toString(),
    quantityKg: sale.quantityKg.toString(),
    unitPriceAtSale: sale.unitPriceAtSale.toString(),
    totalAmount: sale.totalAmount.toString(),
    costPerKgAtSale: sale.costPerKgAtSale?.toString() ?? null,
    paymentType: sale.paymentType,
    createdById: sale.createdById,
    createdByName: userNames.get(sale.createdById) ?? null,
    createdAt: sale.createdAt.toISOString(),
    voidedAt: sale.voidedAt?.toISOString() ?? null,
    voidedByName: sale.voidedById
      ? (userNames.get(sale.voidedById) ?? null)
      : null,
    voidReason: sale.voidReason,
  };
}

export const WITH_SALE_RELATIONS_INCLUDE = {
  product: true,
  customer: true,
} as const;

export const SaleStatusFilterSchema = z.enum(["ACTIVE", "VOIDED", "ALL"]);

export const SaleQuerySchema = z.object({
  // Filters for /manager/sales (Epic 21). `from`/`to` are business-local
  // calendar dates ("YYYY-MM-DD"), both inclusive.
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  productId: z.string().min(1).optional(),
  customerId: z.string().min(1).optional(),
  paymentType: SalePaymentTypeSchema.optional(),
  status: SaleStatusFilterSchema.default("ACTIVE"),
  // Matches the reference code.
  search: z.string().trim().min(1).optional(),
  // Set by /inventory/sales ("own recent sales") to the current session's
  // user id; omitted by /manager/sales, which sees every sale. Both pages
  // share the same sale:read permission — scope is page-level, not
  // permission-level, matching StockBalanceList's detailHrefBase pattern.
  createdById: z.string().optional(),
});

export type SaleQuery = z.input<typeof SaleQuerySchema>;

// A walk-in sale (no customerId) can only ever be CASH — there's no
// LoanAccount to post a SALE_ON_CREDIT transaction against. Encoded as a
// discriminated union on paymentType (same shape as
// CreateLoanTransactionInputSchema) so a walk-in LOAN sale is rejected by
// the schema itself, not left to the UI. See docs/DECISIONS.md.
const SaleProductFields = {
  productId: z.string().min(1, "Product is required"),
  inputQuantity: z.coerce.number().positive().finite(),
  inputUnitName: z.string().trim().min(1, "Unit is required"),
  // Required to record a sale that takes the product's stock below zero.
  // Without it the API answers 409 INSUFFICIENT_STOCK with the available
  // quantity, and the Record Sale dialog asks the user to confirm. See
  // docs/DECISIONS.md, "Epic 21 decisions".
  allowOversell: z.boolean().optional(),
};

export const CreateSaleInputSchema = z.discriminatedUnion("paymentType", [
  z.object({
    paymentType: z.literal("CASH"),
    customerId: z.string().min(1).optional(),
    ...SaleProductFields,
  }),
  z.object({
    paymentType: z.literal("LOAN"),
    customerId: z.string().min(1, "Customer is required for a loan sale"),
    ...SaleProductFields,
  }),
]);

export type CreateSaleInput = z.infer<typeof CreateSaleInputSchema>;

export const SalesSummarySchema = z.object({
  saleCount: z.number().int(),
  totalKg: z.string(),
  totalAmount: z.string(),
  cashAmount: z.string(),
  onAccountAmount: z.string(),
});
export type SalesSummaryDTO = z.infer<typeof SalesSummarySchema>;

export const VoidSaleInputSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, "Say briefly why this sale is being voided")
    .max(500),
});
export type VoidSaleInput = z.infer<typeof VoidSaleInputSchema>;
