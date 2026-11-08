import { PageTransition } from "@/components/motion/page-transition";
import { PublicNavbar } from "@/components/shell/public-navbar";
import { LandingPage } from "@/features/auth/components/landing-page";
import { RoleRedirector } from "@/lib/redirector";
import { GetApiSession } from "@/lib/session";

// Reads the session directly (not via GetSession(), which itself redirects
// unauthenticated visitors to sign-in) — a signed-out visitor should see the
// landing page here, not get bounced straight to the sign-in form. See the
// root layout's `instant` export and docs/DECISIONS.md.
export const instant = false;

export default async function HomePage() {
  const session = await GetApiSession();

  if (session?.user?.id) {
    await RoleRedirector();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar />
      <PageTransition>
        <LandingPage />
      </PageTransition>
    </div>
  );
}
