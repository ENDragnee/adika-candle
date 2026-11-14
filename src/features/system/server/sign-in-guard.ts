import { APIError } from "better-auth/api";
import { RecordActivity } from "@/lib/activity/record-activity";
import { prisma } from "@/lib/prisma";
import { IsMaintenanceExempt } from "./maintenance";
import { GetSystemSettings } from "./settings";

// Account lockout (Epic 24), run from better-auth's sign-in hooks
// (src/lib/activity/auth-activity.ts). Counts consecutive failures per
// account; at the System page's threshold the account is locked for a
// while. A locked account is refused before its password is checked, so
// guessing can't continue during the lock.

type RequestMeta = { ipAddress?: string | null; userAgent?: string | null };

function NormalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function MinutesLeft(until: Date): number {
  return Math.max(1, Math.ceil((until.getTime() - Date.now()) / 60_000));
}

export async function GuardSignIn(
  rawUsername: string,
  meta: RequestMeta,
): Promise<void> {
  const username = NormalizeUsername(rawUsername);
  if (!username) return;
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      name: true,
      lockedUntil: true,
      role: { select: { permissions: { select: { name: true } } } },
    },
  });

  // Maintenance mode: only people who can turn it off may sign in. Checked
  // for unknown usernames too, so the answer doesn't reveal which exist.
  const { maintenance } = await GetSystemSettings();
  const permissions =
    user?.role?.permissions.map((permission) => permission.name) ?? [];
  if (maintenance.enabled && !IsMaintenanceExempt(permissions)) {
    throw new APIError("SERVICE_UNAVAILABLE", {
      code: "MAINTENANCE",
      message: maintenance.message,
    });
  }

  if (!user?.lockedUntil || user.lockedUntil <= new Date()) return;

  const minutes = MinutesLeft(user.lockedUntil);
  await RecordActivity(
    {
      type: "auth",
      action: "auth.sign_in_blocked",
      message: `Blocked sign-in to locked account ${user.name}`,
      severity: "WARN",
      entityType: "user",
      entityId: user.id,
      entityLabel: user.name,
    },
    meta,
  );
  throw new APIError("FORBIDDEN", {
    code: "ACCOUNT_LOCKED",
    message: `This account is locked after too many failed sign-ins. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}, or ask an administrator to unlock it.`,
  });
}

export async function RecordFailedSignIn(
  rawUsername: string,
  meta: RequestMeta,
): Promise<void> {
  const username = NormalizeUsername(rawUsername);
  if (!username) return;
  const existing = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });
  if (!existing) return;

  // Atomic increment, so parallel guesses can't slip past the threshold.
  const user = await prisma.user.update({
    where: { id: existing.id },
    data: { failedSignInCount: { increment: 1 } },
    select: { id: true, name: true, failedSignInCount: true },
  });
  const { security } = await GetSystemSettings();
  if (user.failedSignInCount < security.maxFailedSignIns) return;

  const lockedUntil = new Date(Date.now() + security.lockMinutes * 60_000);
  await prisma.user.update({
    where: { id: user.id },
    data: { lockedUntil, failedSignInCount: 0 },
  });
  await RecordActivity(
    {
      type: "auth",
      action: "auth.account_locked",
      message: `Locked ${user.name}'s account for ${security.lockMinutes} min after ${security.maxFailedSignIns} failed sign-ins`,
      severity: "ERROR",
      entityType: "user",
      entityId: user.id,
      entityLabel: user.name,
      changes: { lockedUntil: lockedUntil.toISOString() },
    },
    meta,
  );
}

export async function RecordSuccessfulSignIn(userId: string): Promise<void> {
  await prisma.user.updateMany({
    where: {
      id: userId,
      OR: [{ failedSignInCount: { gt: 0 } }, { lockedUntil: { not: null } }],
    },
    data: { failedSignInCount: 0, lockedUntil: null },
  });
}
