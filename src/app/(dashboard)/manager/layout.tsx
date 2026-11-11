import { redirect } from "next/navigation";
import { ROLES } from "@/lib/redirector";
import { GetApiSession } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await GetApiSession();

  if (session?.user?.role !== ROLES.MANAGER) {
    redirect("/unauthorized");
  }

  return children;
}
