import { z } from "zod";

export const DynamicApiRouteSchema = z.object({
  id: z.string().min(1, "Route parameter ID is required"),
});

export type DynamicApiRouteInput = z.infer<typeof DynamicApiRouteSchema>;
