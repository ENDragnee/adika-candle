"use client";

import type { VariantProps } from "class-variance-authority";
import { useRouter } from "next/navigation";
import { Button, type buttonVariants } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

type ButtonVariants = VariantProps<typeof buttonVariants>;

interface SignOutButtonProps {
  variant?: ButtonVariants["variant"];
  size?: ButtonVariants["size"];
}

export function SignOutButton({
  variant = "outline",
  size = "sm",
}: SignOutButtonProps) {
  const router = useRouter();

  async function handleClick() {
    await authClient.signOut();
    router.push("/auth/sign-in");
  }

  return (
    <Button variant={variant} size={size} onClick={handleClick}>
      Sign out
    </Button>
  );
}
