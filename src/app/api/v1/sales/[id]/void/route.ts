import { VoidSale } from "@/features/sales/server/void-sale";
import {
  type SaleDTO,
  SaleSchema,
  ToSaleDTO,
  type VoidSaleInput,
  VoidSaleInputSchema,
} from "@/features/sales/validators/sale.schema";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import { LoadUserNames } from "@/lib/server/user-names";

type Params = { id: string };

export const POST = CreateApiRoute<VoidSaleInput, Params, SaleDTO>({
  moduleName: "sales.void",
  schema: VoidSaleInputSchema,
  requiresAuth: { status: true, permission: "sale:void" },
  responseSchema: SaleSchema,
  handler: async (body, session, params) => {
    const sale = await VoidSale(
      params?.id ?? "",
      body.reason,
      session?.id ?? "",
    );
    return ToSaleDTO(
      sale,
      await LoadUserNames([sale.createdById, sale.voidedById]),
    );
  },
});
