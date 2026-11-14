import { z } from "zod";
import { PaginationQuerySchema } from "@/lib/pagination";

// A signed-in session (Epic 23). The session token is never sent — the
// id is enough to end it.
export const SessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userName: z.string(),
  username: z.string().nullable(),
  roleName: z.string().nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.iso.datetime(),
  // better-auth refreshes a session about once a day while it's in use,
  // so this is "recently used", not a live heartbeat.
  updatedAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
  // The session making this request — ending it would sign you out.
  isCurrent: z.boolean(),
  // False when the account holds access the viewer's role doesn't.
  canRevoke: z.boolean(),
});

export type SessionDTO = z.infer<typeof SessionSchema>;

export const SessionQuerySchema = PaginationQuerySchema.extend({
  userId: z.string().min(1).optional(),
  search: z.string().trim().max(100).optional(),
});

export type SessionQuery = z.input<typeof SessionQuerySchema>;

// Exactly one target: one person's sessions, or everyone's except the
// caller's current one (the "sign everyone out" switch).
export const RevokeSessionsInputSchema = z.union([
  z.object({ userId: z.string().min(1) }),
  z.object({ everyone: z.literal(true) }),
]);

export type RevokeSessionsInput = z.infer<typeof RevokeSessionsInputSchema>;

export const RevokeResultSchema = z.object({ revoked: z.number().int() });
export type RevokeResult = z.infer<typeof RevokeResultSchema>;

// Admin's system panel on the dashboard.
export const SessionSummarySchema = z.object({
  activeSessions: z.number().int(),
  signedInUsers: z.number().int(),
  activeUsers: z.number().int(),
  inactiveUsers: z.number().int(),
  failedSignIns24h: z.number().int(),
  lastFailedSignInAt: z.iso.datetime().nullable(),
});

export type SessionSummary = z.infer<typeof SessionSummarySchema>;
