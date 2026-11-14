"use client";

import { LockKeyIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useUpdateSystemSettings } from "../hooks/use-system";
import type { SystemSettings } from "../validators/system.schema";
import { InRange, NumberSetting, SettingCard } from "./setting-card";

// Account lockout thresholds (Epic 24). Locked accounts show on Users,
// where an Admin can unlock them early.
export function SecurityCard({
  settings,
}: {
  settings: SystemSettings["security"];
}) {
  const [attempts, setAttempts] = useState(String(settings.maxFailedSignIns));
  const [minutes, setMinutes] = useState(String(settings.lockMinutes));
  const update = useUpdateSystemSettings("Sign-in security saved");
  const valid = InRange(attempts, 3, 20) && InRange(minutes, 1, 1440);
  const dirty =
    Number(attempts) !== settings.maxFailedSignIns ||
    Number(minutes) !== settings.lockMinutes;

  return (
    <SettingCard
      icon={LockKeyIcon}
      title="Sign-in security"
      description="Lock an account after repeated wrong passwords. Unlock early from Users."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberSetting
          id="max-failed"
          label="Lock after"
          value={attempts}
          onChange={setAttempts}
          min={3}
          max={20}
          suffix="failed tries"
          hint="3–20 in a row"
        />
        <NumberSetting
          id="lock-minutes"
          label="Keep locked for"
          value={minutes}
          onChange={setMinutes}
          min={1}
          max={1440}
          suffix="minutes"
          hint="1–1440 (one day)"
        />
      </div>
      <Button
        className="self-start"
        size="sm"
        loading={update.isPending}
        disabled={!valid || !dirty}
        onClick={() =>
          update.mutate({
            security: {
              maxFailedSignIns: Number(attempts),
              lockMinutes: Number(minutes),
            },
          })
        }
      >
        Save
      </Button>
    </SettingCard>
  );
}
