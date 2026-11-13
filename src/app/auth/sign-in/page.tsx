import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SignInForm } from "@/features/auth/components/sign-in-form";

export default function SignInPage() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold tracking-tight">
          Adika Candle
        </CardTitle>
        <CardDescription>
          Sales, stock, and loan management for the candle factory.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* SignInForm reads ?next= via useSearchParams. */}
        <Suspense>
          <SignInForm />
        </Suspense>
      </CardContent>
    </Card>
  );
}
