import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { SystemConsole } from "@/features/system/components/system-console";
import { CheckPermission } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

export default async function SystemPage() {
  const allowed = await CheckPermission("system:manage");

  if (!allowed) {
    redirect("/unauthorized");
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader description="Sign-in security, maintenance mode, closed periods, log retention and backups." />
      <SystemConsole />
    </div>
  );
}
