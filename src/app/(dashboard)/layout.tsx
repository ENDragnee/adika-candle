import { redirect } from "next/navigation";
import { PageTransition } from "@/components/motion/page-transition";
import { AppShell } from "@/components/shell/app-shell";
import { GetSession } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await GetSession();

  // Epic 24: a password someone else chose must be replaced first.
  if (session.user.mustChangePassword) {
    redirect("/account/change-password");
  }

  // Nav items are derived from the user's permissions inside AppShell
  // (BuildNavItems) — passing the user is enough.
  return (
    <AppShell user={session.user}>
      <PageTransition>{children}</PageTransition>
    </AppShell>
  );
}
