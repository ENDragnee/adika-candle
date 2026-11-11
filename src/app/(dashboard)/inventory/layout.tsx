import { redirect } from "next/navigation";
import { GetApiSession } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

// Access to individual pages is decided by permissions, checked in each
// page.tsx (Epic 21) — this layout only turns away users with no active
// role at all (signed out, deactivated, or never assigned a role). Before
// Epic 21 it allowed exactly one role by name, which made most of the
// Roles page's permission toggles ineffective. See docs/DECISIONS.md.
export default async function InventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await GetApiSession();

  if (!session?.user?.role) {
    redirect("/unauthorized");
  }

  return children;
}
