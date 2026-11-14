import { redirect } from "next/navigation";
import { PageTransition } from "@/components/motion/page-transition";
import { AppShell } from "@/components/shell/app-shell";
import { MaintenanceBanner } from "@/features/system/components/maintenance-banner";
import { GetSystemSettings } from "@/features/system/server/settings";
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

  const { maintenance } = await GetSystemSettings();

  // Nav items are derived from the user's permissions inside AppShell
  // (BuildNavItems) — passing the user is enough.
  return (
    <AppShell user={session.user}>
      {maintenance.enabled && <MaintenanceBanner />}
      <PageTransition>{children}</PageTransition>
    </AppShell>
  );
}
