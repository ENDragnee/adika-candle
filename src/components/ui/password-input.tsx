"use client";

import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Shared password field with a show/hide toggle — used by sign-in, user
// creation, and the "Set password" action, so the toggle only had to be
// built once. Defaults to masked; toggling flips the underlying input's
// `type` rather than layering a separate reveal element.
export function PasswordInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        type={isVisible ? "text" : "password"}
        className={cn("pr-9", className)}
        {...props}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="absolute top-1/2 right-0.5 -translate-y-1/2"
        onClick={() => setIsVisible((value) => !value)}
        aria-label={isVisible ? "Hide password" : "Show password"}
        aria-pressed={isVisible}
        tabIndex={-1}
      >
        {isVisible ? <EyeSlashIcon /> : <EyeIcon />}
      </Button>
    </div>
  );
}
