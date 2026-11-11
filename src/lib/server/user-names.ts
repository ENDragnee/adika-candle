import { prisma } from "@/lib/prisma";

// `createdById` columns across the domain tables are plain strings, not
// Prisma relations to User (auth tables stay decoupled from domain
// tables). Batch-resolve them to display names for list responses.
export async function LoadUserNames(
  ids: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (unique.length === 0) return new Map();
  const users = await prisma.user.findMany({
    where: { id: { in: unique } },
    select: { id: true, name: true },
  });
  return new Map(users.map((user) => [user.id, user.name]));
}
