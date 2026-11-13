import { NextResponse } from "next/server";
import {
  DecodeCursor,
  EncodeCursor,
} from "@/features/activities/server/cursor";
import {
  ActivityPageSchema,
  ActivityQuerySchema,
} from "@/features/activities/validators/activity.schema";
import type { Prisma } from "@/generated/prisma/client";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import { AddBusinessDays, StartOfBusinessDate } from "@/lib/business-time";
import { prisma } from "@/lib/prisma";

// The activity log, newest first, cursor-paginated on (createdAt, id).
export const GET = CreateApiRoute({
  moduleName: "activities",
  schema: ActivityQuerySchema,
  requiresAuth: { status: true, permission: "activity:read" },
  responseSchema: ActivityPageSchema,
  handler: async (query) => {
    const cursor = query.cursor ? DecodeCursor(query.cursor) : null;
    if (query.cursor && !cursor) {
      return NextResponse.json(
        { error: "That page link is no longer valid", code: "BAD_CURSOR" },
        { status: 400 },
      );
    }

    const createdAt: Prisma.DateTimeFilter = {};
    if (query.from) createdAt.gte = StartOfBusinessDate(query.from);
    if (query.to) {
      createdAt.lt = AddBusinessDays(StartOfBusinessDate(query.to), 1);
    }

    const where: Prisma.LogWhereInput = {
      AND: [
        query.from || query.to ? { createdAt } : {},
        query.userId ? { userId: query.userId } : {},
        query.type ? { type: query.type } : {},
        query.severity ? { severity: query.severity } : {},
        query.search
          ? {
              OR: [
                { message: { contains: query.search, mode: "insensitive" } },
                {
                  entityLabel: {
                    contains: query.search,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {},
        // Strictly after the cursor row in (createdAt desc, id desc) order.
        cursor
          ? {
              OR: [
                { createdAt: { lt: cursor.createdAt } },
                { createdAt: cursor.createdAt, id: { lt: cursor.id } },
              ],
            }
          : {},
      ],
    };

    const rows = await prisma.log.findMany({
      where,
      include: { user: { select: { name: true } } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: query.limit + 1,
    });
    const page = rows.slice(0, query.limit);
    const last = page.at(-1);

    return {
      data: page.map((row) => ({
        id: row.id,
        type: row.type,
        action: row.action,
        severity: row.severity,
        message: row.message,
        entityType: row.entityType,
        entityId: row.entityId,
        entityLabel: row.entityLabel,
        changes:
          row.changes &&
          typeof row.changes === "object" &&
          !Array.isArray(row.changes)
            ? (row.changes as Record<string, unknown>)
            : null,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        userId: row.userId,
        userName: row.user?.name ?? null,
        createdAt: row.createdAt.toISOString(),
      })),
      nextCursor:
        rows.length > query.limit && last
          ? EncodeCursor({ createdAt: last.createdAt, id: last.id })
          : null,
    };
  },
});
