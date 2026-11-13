import { z } from "zod";

export const ActivitySchema = z.object({
  id: z.string(),
  type: z.string(),
  action: z.string(),
  severity: z.enum(["INFO", "WARN", "ERROR"]),
  message: z.string(),
  entityType: z.string().nullable(),
  entityId: z.string().nullable(),
  entityLabel: z.string().nullable(),
  changes: z.record(z.string(), z.unknown()).nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  userId: z.string().nullable(),
  userName: z.string().nullable(),
  createdAt: z.iso.datetime(),
});
export type ActivityDTO = z.infer<typeof ActivitySchema>;

export const ACTIVITY_PAGE_LIMIT_MAX = 100;

// Cursor pagination (Epic 22): the activity log only ever grows at the
// top, so offset pages would shift under the reader as new entries
// arrive. A cursor names the last row seen — (createdAt, id) — and the
// next page starts strictly after it, regardless of inserts.
export const ActivityQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(ACTIVITY_PAGE_LIMIT_MAX)
    .default(30),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  userId: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  severity: z.enum(["INFO", "WARN", "ERROR"]).optional(),
  search: z.string().trim().min(1).max(100).optional(),
});
export type ActivityQuery = z.input<typeof ActivityQuerySchema>;

export const ActivityPageSchema = z.object({
  data: z.array(ActivitySchema),
  nextCursor: z.string().nullable(),
});
export type ActivityPageDTO = z.infer<typeof ActivityPageSchema>;

export const ActivityFacetsSchema = z.object({
  users: z.array(z.object({ id: z.string(), name: z.string() })),
  types: z.array(z.string()),
});
export type ActivityFacetsDTO = z.infer<typeof ActivityFacetsSchema>;
