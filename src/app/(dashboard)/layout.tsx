import { redirect } from "next/navigation";
import { FeatureFlagProvider } from "@/components/providers/feature-flag-provider";
import { AppShell } from "@/components/shell/app-shell";
import { MaintenanceBanner } from "@/features/system/components/maintenance-banner";
import { GetSystemSettings } from "@/features/system/server/settings";
import { GetSaleUnitMode } from "@/lib/feature-flags/server";
import { GetSession } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await GetSession();

  // Epic 24: maintenance mode shuts out everyone who can't turn it off,
  // and a password someone else chose must be replaced first.
  if (session.user.maintenance) {
    redirect("/maintenance");
  }
  if (session.user.mustChangePassword) {
    redirect("/account/change-password");
  }

  const [{ maintenance }, saleUnitMode] = await Promise.all([
    GetSystemSettings(),
    GetSaleUnitMode(),
  ]);

  // Nav items are derived from the user's permissions inside AppShell
  // (BuildNavItems) — passing the user is enough.
  return (
    <FeatureFlagProvider flags={{ saleUnitMode }}>
      <AppShell user={session.user}>
        {maintenance.enabled && <MaintenanceBanner />}
        {children}
      </AppShell>
    </FeatureFlagProvider>
  );
}
