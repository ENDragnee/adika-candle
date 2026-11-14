"use client";

import {
  DevicesIcon,
  ShieldWarningIcon,
  UserCheckIcon,
  UserMinusIcon,
} from "@phosphor-icons/react";
import { Section } from "@/components/ui/section";
import { CardSkeleton } from "@/components/ui/skeleton";
import { StatTile } from "@/features/analytics/components/stat-tile";
import { FormatRelative, Pluralize } from "@/lib/format";
import { useSessionSummary } from "../hooks/use-sessions";

// The Admin's system panel at the top of the dashboard (Epic 23): who is
// signed in right now, how many accounts are enabled, and failed sign-ins
// in the last 24 hours — each linking to the page that acts on it.
export function SystemOverview() {
  const { data, isLoading } = useSessionSummary();

  return (
    <Section
      title="System"
      description="Sign-ins and accounts. Only you can see this panel."
    >
      {isLoading || !data ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
            <CardSkeleton key={index} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label="Signed in now"
            value={data.signedInUsers}
            icon={DevicesIcon}
            hint={`On ${Pluralize(data.activeSessions, "device")}`}
            href="/manager/sessions"
          />
          <StatTile
            label="Active accounts"
            value={data.activeUsers}
            icon={UserCheckIcon}
            href="/manager/users"
          />
          <StatTile
            label="Deactivated accounts"
            value={data.inactiveUsers}
            icon={UserMinusIcon}
            href="/manager/users"
          />
          <StatTile
            label="Failed sign-ins (24h)"
            value={data.failedSignIns24h}
            icon={ShieldWarningIcon}
            hint={
              data.lastFailedSignInAt
                ? `Last ${FormatRelative(data.lastFailedSignInAt)}`
                : "None recorded"
            }
            href="/manager/activities"
            className={
              data.failedSignIns24h >= 5
                ? "border-[var(--color-status-critical)]"
                : undefined
            }
          />
        </div>
      )}
    </Section>
  );
}
