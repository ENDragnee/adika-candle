import {
  ActiveSessionWhere,
  OutOfReachRoleIds,
} from "@/features/sessions/server/session-control";
import {
  SessionQuerySchema,
  SessionSchema,
} from "@/features/sessions/validators/session.schema";
import type { Prisma } from "@/generated/prisma/client";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import {
  BuildPaginationMeta,
  PaginatedResponseSchema,
  ToSkipTake,
} from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { GetApiSession } from "@/lib/session";

// Every signed-in device (Epic 23), most recently used first.
export const GET = CreateApiRoute({
  moduleName: "sessions",
  schema: SessionQuerySchema,
  requiresAuth: { status: true, permission: "session:manage" },
  responseSchema: PaginatedResponseSchema(SessionSchema),
  handler: async (query, session) => {
    const search = query.search?.trim();
    const where: Prisma.SessionWhereInput = {
      ...ActiveSessionWhere(),
      ...(query.userId && { userId: query.userId }),
      ...(search && {
        OR: [
          { user: { name: { contains: search, mode: "insensitive" } } },
          { user: { username: { contains: search, mode: "insensitive" } } },
          { ipAddress: { contains: search } },
        ],
      }),
    };

    const [rows, total, current, outOfReach] = await Promise.all([
      prisma.session.findMany({
        where,
        include: {
          user: {
            select: {
              name: true,
              username: true,
              roleId: true,
              role: { select: { name: true } },
            },
          },
        },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        ...ToSkipTake(query),
      }),
      prisma.session.count({ where }),
      GetApiSession(),
      OutOfReachRoleIds(session?.permissions ?? []),
    ]);

    return {
      data: rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        userName: row.user.name,
        username: row.user.username,
        roleName: row.user.role?.name ?? null,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        expiresAt: row.expiresAt.toISOString(),
        isCurrent: row.id === current?.session.id,
        canRevoke:
          row.id !== current?.session.id &&
          !(row.user.roleId && outOfReach.includes(row.user.roleId)),
      })),
      pagination: BuildPaginationMeta(query, total),
    };
  },
});
