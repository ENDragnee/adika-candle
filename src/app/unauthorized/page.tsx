import Link from "next/link";
import { SignOutButton } from "@/features/auth/components/sign-out-button";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-lg font-semibold">Unauthorized</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        You don&apos;t have permission to view that page.
      </p>
      <div className="flex items-center gap-3">
        <Link href="/" className="text-sm underline underline-offset-4">
          Go to your dashboard
        </Link>
        <SignOutButton />
      </div>
    </main>
  );
}
