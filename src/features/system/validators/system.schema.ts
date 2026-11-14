import { z } from "zod";

// System settings (Epic 24). Each group is one SystemSetting row; a
// missing row or a missing field falls back to these defaults, so adding
// a field never needs a data migration.

export const SecuritySettingsSchema = z.object({
  // Consecutive failed sign-ins before the account locks.
  maxFailedSignIns: z.number().int().min(3).max(20).default(5),
  lockMinutes: z
    .number()
    .int()
    .min(1)
    .max(24 * 60)
    .default(15),
});

export const MaintenanceSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  message: z
    .string()
    .trim()
    .max(300)
    .default("The system is down for maintenance. Please try again later."),
  startedAt: z.iso.datetime().nullable().default(null),
});

export const PeriodLockSettingsSchema = z.object({
  // Business date (YYYY-MM-DD, Africa/Addis_Ababa). Sales on or before it
  // can't be voided or restored. null = nothing locked.
  lockedThrough: z.iso.date().nullable().default(null),
});

export const RetentionSettingsSchema = z.object({
  logRetentionDays: z.number().int().min(90).max(3650).default(365),
});

export const SystemSettingsSchema = z.object({
  security: SecuritySettingsSchema.prefault({}),
  maintenance: MaintenanceSettingsSchema.prefault({}),
  periodLock: PeriodLockSettingsSchema.prefault({}),
  retention: RetentionSettingsSchema.prefault({}),
});

export type SystemSettings = z.infer<typeof SystemSettingsSchema>;
export type SystemSettingKey = keyof SystemSettings;
export const SYSTEM_SETTING_KEYS = Object.keys(
  SystemSettingsSchema.shape,
) as SystemSettingKey[];

// PATCH body: any subset of groups, each with any subset of its fields.
// startedAt is server-managed.
export const UpdateSystemSettingsInputSchema = z.object({
  security: SecuritySettingsSchema.partial().optional(),
  maintenance: MaintenanceSettingsSchema.omit({ startedAt: true })
    .partial()
    .extend({
      // Also end every session that maintenance would lock out.
      signOutOthers: z.boolean().optional(),
    })
    .optional(),
  periodLock: PeriodLockSettingsSchema.partial().optional(),
  retention: RetentionSettingsSchema.partial().optional(),
});

export type UpdateSystemSettingsInput = z.infer<
  typeof UpdateSystemSettingsInputSchema
>;

export const LogPurgePreviewSchema = z.object({
  retentionDays: z.number().int(),
  cutoff: z.iso.datetime(),
  purgeable: z.number().int(),
  total: z.number().int(),
  oldestAt: z.iso.datetime().nullable(),
});
export type LogPurgePreview = z.infer<typeof LogPurgePreviewSchema>;

export const LogPurgeResultSchema = z.object({
  deleted: z.number().int(),
  cutoff: z.iso.datetime(),
});
export type LogPurgeResult = z.infer<typeof LogPurgeResultSchema>;
