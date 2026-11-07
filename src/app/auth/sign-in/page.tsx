import { SignInForm } from "@/features/auth/components/sign-in-form";

export default function SignInPage() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Sign in</h1>
        <p className="text-sm text-muted-foreground">
          Adika Candle factory management
        </p>
      </div>
      <SignInForm />
    </div>
  );
}
