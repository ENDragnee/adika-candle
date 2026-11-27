import { PublicNavbar } from "@/components/shell/public-navbar";
import { RoleRedirector } from "@/lib/redirector";
import { GetApiSession } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await GetApiSession();

  if (session?.user?.id) {
    await RoleRedirector();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar showSignIn={false} />
      <main className="flex flex-1 items-center justify-center p-6">
        {children}
      </main>
    </div>
  );
}
