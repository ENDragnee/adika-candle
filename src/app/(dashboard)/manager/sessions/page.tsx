import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { SessionManager } from "@/features/sessions/components/session-manager";
import { CheckPermission } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

export default async function SessionsPage() {
  const allowed = await CheckPermission("session:manage");

  if (!allowed) {
    redirect("/unauthorized");
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader description="Everyone who is signed in, on which device. End a session to sign that device out." />
      <SessionManager />
    </div>
  );
}
