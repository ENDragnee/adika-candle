import { prisma } from "@/lib/prisma";
import { GetSystemSettings } from "./settings";

// Activity-log retention (Epic 24). Entries older than the System page's
// retention window can be purged — by an Admin's click, never on a
// timer: the app has no scheduler, and silent data deletion belongs
// behind a person's decision. The purge itself is logged afterwards, so
// the log always shows who emptied it and when.

export async function RetentionCutoff(): Promise<{
  cutoff: Date;
  days: number;
}> {
  const { retention } = await GetSystemSettings();
  return {
    days: retention.logRetentionDays,
    cutoff: new Date(Date.now() - retention.logRetentionDays * 86_400_000),
  };
}

export async function PreviewLogPurge() {
  const { cutoff, days } = await RetentionCutoff();
  const [purgeable, total, oldest] = await Promise.all([
    prisma.log.count({ where: { createdAt: { lt: cutoff } } }),
    prisma.log.count(),
    prisma.log.findFirst({
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
  ]);
  return {
    retentionDays: days,
    cutoff: cutoff.toISOString(),
    purgeable,
    total,
    oldestAt: oldest?.createdAt.toISOString() ?? null,
  };
}

export async function PurgeOldLogs(): Promise<{
  deleted: number;
  cutoff: string;
}> {
  const { cutoff } = await RetentionCutoff();
  const { count } = await prisma.log.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  return { deleted: count, cutoff: cutoff.toISOString() };
}
