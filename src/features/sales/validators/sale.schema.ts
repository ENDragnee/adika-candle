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
  paymentType: SalePaymentTypeSchema,
  createdById: z.string(),
  createdAt: z.iso.datetime(),
});

export type SaleDTO = z.infer<typeof SaleSchema>;

export const SaleListResponseSchema = z.array(SaleSchema);

type SaleWithRelations = Sale & { product: Product; customer: Customer | null };

export function ToSaleDTO(sale: SaleWithRelations): SaleDTO {
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
    paymentType: sale.paymentType,
    createdById: sale.createdById,
    createdAt: sale.createdAt.toISOString(),
  };
}

export const WITH_SALE_RELATIONS_INCLUDE = {
  product: true,
  customer: true,
} as const;

export const SaleQuerySchema = z.object({
  // Set by /inventory/sales ("own recent sales") to the current session's
  // user id; omitted by /manager/sales, which sees every sale. Both pages
  // share the same sale:read permission — scope is page-level, not
  // permission-level, matching StockBalanceList's detailHrefBase pattern.
  createdById: z.string().optional(),
});

export type SaleQuery = z.infer<typeof SaleQuerySchema>;

// A walk-in sale (no customerId) can only ever be CASH — there's no
// LoanAccount to post a SALE_ON_CREDIT transaction against. Encoded as a
// discriminated union on paymentType (same shape as
// CreateLoanTransactionInputSchema) so a walk-in LOAN sale is rejected by
// the schema itself, not left to the UI. See docs/DECISIONS.md.
const SaleProductFields = {
  productId: z.string().min(1, "Product is required"),
  inputQuantity: z.coerce.number().positive().finite(),
  inputUnitName: z.string().trim().min(1, "Unit is required"),
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
