import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";

export const GET = CreateApiRoute({
  moduleName: "health",
  requiresAuth: { status: false, permission: "" },
  handler: async () => ({
    status: "ok",
    service: "adika-candle",
    time: new Date().toISOString(),
  }),
});
