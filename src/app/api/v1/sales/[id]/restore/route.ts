import { RestoreSale } from "@/features/sales/server/restore-sale";
import {
  type RestoreSaleInput,
  RestoreSaleInputSchema,
  type SaleDTO,
  SaleSchema,
  ToSaleDTO,
} from "@/features/sales/validators/sale.schema";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import { LoadUserNames } from "@/lib/server/user-names";

type Params = { id: string };

// Bring back a voided sale (Epic 24, Admin): see RestoreSale.
export const POST = CreateApiRoute<RestoreSaleInput, Params, SaleDTO>({
  moduleName: "sales.restore",
  schema: RestoreSaleInputSchema,
  requiresAuth: { status: true, permission: "sale:restore" },
  responseSchema: SaleSchema,
  activity: ({ body, result }) => ({
    type: "sales",
    action: "sale.restore",
    message: `Restored voided sale ${result.referenceCode} (ETB ${result.totalAmount})`,
    severity: "WARN",
    entityType: "sale",
    entityId: result.id,
    entityLabel: result.referenceCode,
    changes: { reason: body.reason, totalAmount: result.totalAmount },
  }),
  handler: async (body, session, params) => {
    const sale = await RestoreSale(
      params?.id ?? "",
      body.reason,
      session?.id ?? "",
    );
    return ToSaleDTO(sale, await LoadUserNames([sale.createdById]));
  },
});
