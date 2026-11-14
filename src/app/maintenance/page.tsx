import { WrenchIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { PublicNavbar } from "@/components/shell/public-navbar";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { GetSystemSettings } from "@/features/system/server/settings";
import { FormatRelative } from "@/lib/format";
import { GetApiSession } from "@/lib/session";

// Reads settings and the session — not a candidate for instant navigation.
export const instant = false;

// Where everyone is sent while maintenance mode is on (Epic 24).
export default async function MaintenancePage() {
  const [{ maintenance }, session] = await Promise.all([
    GetSystemSettings(),
    GetApiSession(),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar showSignIn={false} />
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-muted">
          <WrenchIcon className="size-6 text-muted-foreground" />
        </span>
        {maintenance.enabled ? (
          <>
            <h1 className="text-lg font-semibold">Down for maintenance</h1>
            <p className="max-w-sm text-sm text-muted-foreground">
              {maintenance.message}
            </p>
            {maintenance.startedAt && (
              <p className="text-xs text-muted-foreground">
                Started {FormatRelative(maintenance.startedAt)}
              </p>
            )}
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold">We're back</h1>
            <p className="max-w-sm text-sm text-muted-foreground">
              Maintenance is over. You can carry on where you left off.
            </p>
            <Link href="/" className="text-sm underline underline-offset-4">
              Go to your dashboard
            </Link>
          </>
        )}
        {session?.user && <SignOutButton />}
      </main>
    </div>
  );
}
