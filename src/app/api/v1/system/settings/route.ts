import { EndSessionsBlockedByMaintenance } from "@/features/system/server/maintenance";
import {
  GetSystemSettings,
  SaveSystemSetting,
} from "@/features/system/server/settings";
import {
  SystemSettingsSchema,
  type UpdateSystemSettingsInput,
  UpdateSystemSettingsInputSchema,
} from "@/features/system/validators/system.schema";
import type { ActivityInput } from "@/lib/activity/record-activity";
import { CreateApiRoute } from "@/lib/api-handlers/rest.handler";
import { BusinessDateKey } from "@/lib/business-time";
import { DomainError } from "@/lib/server/domain-error";

export const GET = CreateApiRoute({
  moduleName: "system.settings",
  requiresAuth: { status: true, permission: "system:manage" },
  responseSchema: SystemSettingsSchema,
  handler: async () => GetSystemSettings(),
});

function Describe(body: UpdateSystemSettingsInput): ActivityInput {
  if (body.maintenance?.enabled !== undefined) {
    return {
      type: "system",
      action: body.maintenance.enabled
        ? "system.maintenance_on"
        : "system.maintenance_off",
      message: body.maintenance.enabled
        ? "Turned maintenance mode on"
        : "Turned maintenance mode off",
      severity: "ERROR",
      changes: { ...body.maintenance },
    };
  }
  if (body.periodLock) {
    return {
      type: "system",
      action: "system.period_lock",
      message: body.periodLock.lockedThrough
        ? `Locked the books through ${body.periodLock.lockedThrough}`
        : "Unlocked all past periods",
      severity: "WARN",
      changes: { ...body.periodLock },
    };
  }
  return {
    type: "system",
    action: "system.settings",
    message: `Changed system settings (${Object.keys(body).join(", ")})`,
    severity: "WARN",
    changes: { ...body },
  };
}

// Partial update of any setting groups (Epic 24). Each group is merged
// over its current value, validated, then saved.
export const PATCH = CreateApiRoute({
  moduleName: "system.settings",
  schema: UpdateSystemSettingsInputSchema,
  requiresAuth: { status: true, permission: "system:manage" },
  responseSchema: SystemSettingsSchema,
  activity: ({ body }) => Describe(body),
  handler: async (body, session) => {
    const current = await GetSystemSettings();

    if (body.security) {
      await SaveSystemSetting(
        "security",
        SystemSettingsSchema.shape.security.parse({
          ...current.security,
          ...body.security,
        }),
        session?.id,
      );
    }

    if (body.maintenance) {
      const { signOutOthers, ...fields } = body.maintenance;
      const turningOn = fields.enabled === true && !current.maintenance.enabled;
      const next = { ...current.maintenance, ...fields };
      next.startedAt = next.enabled
        ? turningOn
          ? new Date().toISOString()
          : current.maintenance.startedAt
        : null;
      await SaveSystemSetting(
        "maintenance",
        SystemSettingsSchema.shape.maintenance.parse(next),
        session?.id,
      );
      if (next.enabled && signOutOthers) {
        await EndSessionsBlockedByMaintenance();
      }
    }

    if (body.periodLock) {
      // Today is still being traded; the latest lockable day is yesterday.
      const through = body.periodLock.lockedThrough;
      if (through && through >= BusinessDateKey(new Date())) {
        throw new DomainError(
          "You can close the books up to yesterday, not today or later",
          400,
          "INVALID_LOCK_DATE",
        );
      }
      await SaveSystemSetting(
        "periodLock",
        SystemSettingsSchema.shape.periodLock.parse({
          ...current.periodLock,
          ...body.periodLock,
        }),
        session?.id,
      );
    }

    if (body.retention) {
      await SaveSystemSetting(
        "retention",
        SystemSettingsSchema.shape.retention.parse({
          ...current.retention,
          ...body.retention,
        }),
        session?.id,
      );
    }

    return GetSystemSettings();
  },
});
