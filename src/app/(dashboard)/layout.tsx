import { PageTransition } from "@/components/motion/page-transition";
import { AppShell } from "@/components/shell/app-shell";
import {
  INVENTORY_NAV_ITEMS,
  MANAGER_NAV_ITEMS,
} from "@/components/shell/nav-config";
import { ROLES } from "@/lib/redirector";
import { GetSession } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await GetSession();
  const navItems =
    session.user.role === ROLES.MANAGER
      ? MANAGER_NAV_ITEMS
      : INVENTORY_NAV_ITEMS;

  return (
    <AppShell user={session.user} navItems={navItems}>
      <PageTransition>{children}</PageTransition>
    </AppShell>
  );
}
