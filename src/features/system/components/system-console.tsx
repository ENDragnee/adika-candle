"use client";

import { CardSkeleton } from "@/components/ui/skeleton";
import { useSystemSettings } from "../hooks/use-system";
import { BackupCard } from "./backup-card";
import { MaintenanceCard } from "./maintenance-card";
import { PeriodLockCard } from "./period-lock-card";
import { RetentionCard } from "./retention-card";
import { SecurityCard } from "./security-card";

// /manager/system (Epic 24): the Admin's controls, one card per power.
export function SystemConsole() {
  const { data: settings, isLoading } = useSystemSettings();

  if (isLoading || !settings) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
          <CardSkeleton key={index} className="h-48" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <SecurityCard settings={settings.security} />
      <PeriodLockCard
        key={settings.periodLock.lockedThrough ?? "open"}
        settings={settings.periodLock}
      />
      <MaintenanceCard
        key={String(settings.maintenance.enabled)}
        settings={settings.maintenance}
      />
      <BackupCard />
      <RetentionCard settings={settings.retention} />
    </div>
  );
}
