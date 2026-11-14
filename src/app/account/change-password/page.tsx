import Link from "next/link";
import { PublicNavbar } from "@/components/shell/public-navbar";
import { Card, CardContent } from "@/components/ui/card";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { ChangePasswordForm } from "@/features/system/components/change-password-form";
import { prisma } from "@/lib/prisma";
import { GetSession } from "@/lib/session";

// Reads the session directly — not a candidate for instant navigation.
export const instant = false;

// Outside the dashboard layout on purpose (Epic 24): someone who must
// change their password has no permissions yet, and the dashboard layout
// sends them here.
export default async function ChangePasswordPage() {
  const session = await GetSession();
  const required = session.user.mustChangePassword;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, username: true, email: true },
  });

  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar showSignIn={false} />
      <main className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-sm">
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-lg font-semibold">
                {required ? "Choose your own password" : "Change password"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {required
                  ? "Your password was set by someone else. Pick a new one only you know before you continue."
                  : "Your other devices will be signed out."}
              </p>
            </div>
            <ChangePasswordForm
              personal={[
                user?.name ?? null,
                user?.username ?? null,
                user?.email ?? null,
              ]}
            />
            <div className="flex items-center justify-between text-sm">
              {required ? (
                <span />
              ) : (
                <Link href="/" className="underline underline-offset-4">
                  Back to the app
                </Link>
              )}
              <SignOutButton />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
