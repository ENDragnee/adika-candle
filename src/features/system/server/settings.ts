import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  SYSTEM_SETTING_KEYS,
  type SystemSettingKey,
  type SystemSettings,
  SystemSettingsSchema,
} from "../validators/system.schema";

// Read on every authenticated request (customSession checks maintenance
// mode), so keep a short in-process cache. An update clears it here;
// other server instances pick the change up within CACHE_MS.
const CACHE_MS = 5_000;
let cache: { value: SystemSettings; at: number } | null = null;

export async function GetSystemSettings(): Promise<SystemSettings> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  const rows = await prisma.systemSetting.findMany();
  const raw = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  // A row that no longer validates (e.g. a field's limits tightened)
  // falls back to defaults rather than breaking every request.
  const parsed = SystemSettingsSchema.safeParse(raw);
  const value = parsed.success
    ? parsed.data
    : SystemSettingsSchema.parse(
        Object.fromEntries(
          SYSTEM_SETTING_KEYS.map((key) => {
            const one = SystemSettingsSchema.shape[key].safeParse(raw[key]);
            return [key, one.success ? one.data : {}];
          }),
        ),
      );
  cache = { value, at: Date.now() };
  return value;
}

export async function SaveSystemSetting<K extends SystemSettingKey>(
  key: K,
  value: SystemSettings[K],
  updatedById: string | undefined,
): Promise<void> {
  const json = value as unknown as Prisma.InputJsonValue;
  await prisma.systemSetting.upsert({
    where: { key },
    update: { value: json, updatedById },
    create: { key, value: json, updatedById },
  });
  cache = null;
}
