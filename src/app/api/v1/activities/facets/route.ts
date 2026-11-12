import { ActivityFacetsSchema } from "@/features/activities/validators/activity.schema";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import { prisma } from "@/lib/prisma";

// Filter options for the Activities page: everyone who has done
// something, and every area that has entries.
export const GET = CreateApiRoute({
  moduleName: "activities.facets",
  requiresAuth: { status: true, permission: "activity:read" },
  responseSchema: ActivityFacetsSchema,
  handler: async () => {
    const [actors, types] = await Promise.all([
      prisma.log.groupBy({ by: ["userId"], where: { userId: { not: null } } }),
      prisma.log.groupBy({ by: ["type"], orderBy: { type: "asc" } }),
    ]);
    const users = await prisma.user.findMany({
      where: {
        id: { in: actors.flatMap((row) => (row.userId ? [row.userId] : [])) },
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return { users, types: types.map((row) => row.type) };
  },
});
