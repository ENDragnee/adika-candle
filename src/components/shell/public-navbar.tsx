import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "./theme-switcher";

// Shared header for pre-auth pages (landing, sign-in) — the dashboard's
// own AppShell/MobileHeader are unrelated and unaffected by this.
export function PublicNavbar({ showSignIn = true }: { showSignIn?: boolean }) {
  return (
    <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
      <Link href="/" className="text-sm font-semibold">
        Adika Candle
      </Link>
      <div className="flex items-center gap-2">
        <ThemeSwitcher />
        {showSignIn && (
          <Button asChild size="sm">
            <Link href="/auth/sign-in">Sign in</Link>
          </Button>
        )}
      </div>
    </header>
  );
}
