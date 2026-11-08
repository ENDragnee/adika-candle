import Link from "next/link";
import { Button } from "@/components/ui/button";

export function LandingPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Adika Candle</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Sales, stock, and loan management for the candle factory.
      </p>
      <Button asChild>
        <Link href="/auth/sign-in">Sign in</Link>
      </Button>
    </div>
  );
}
