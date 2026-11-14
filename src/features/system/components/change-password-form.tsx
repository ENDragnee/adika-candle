"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PasswordField, PasswordIsValid } from "@/components/ui/password-field";
import { PasswordInput } from "@/components/ui/password-input";
import { ChangeOwnPassword } from "../services/account.service";

// Your own password (Epic 24): the current one, then a new one twice under
// the shared policy. Signs your other devices out.
export function ChangePasswordForm({
  personal,
}: {
  personal: (string | null)[];
}) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const context = { personal };
  const mismatch = confirm.length > 0 && confirm !== password;
  const sameAsCurrent = password.length > 0 && password === current;
  const canSubmit =
    current.length > 0 &&
    PasswordIsValid(password, context) &&
    confirm === password &&
    !sameAsCurrent;

  const change = useMutation({
    mutationFn: ChangeOwnPassword,
    onSuccess: () => {
      toast.success("Password changed. Your other devices were signed out.");
      router.push("/");
      router.refresh();
    },
    meta: { errorTitle: "Couldn't change your password" },
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    await change.mutateAsync({
      currentPassword: current,
      password,
      confirmPassword: confirm,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="current-password" className="text-sm font-medium">
          Current password
        </label>
        <PasswordInput
          id="current-password"
          autoComplete="current-password"
          value={current}
          onChange={(event) => setCurrent(event.target.value)}
          required
        />
      </div>
      <PasswordField
        id="new-password"
        label="New password"
        value={password}
        onChange={setPassword}
        context={context}
      />
      {sameAsCurrent && (
        <p className="-mt-2 text-xs text-destructive" role="alert">
          Choose a password different from your current one.
        </p>
      )}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirm-new-password" className="text-sm font-medium">
          Type it again
        </label>
        <PasswordInput
          id="confirm-new-password"
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          aria-invalid={mismatch}
          required
        />
        {mismatch && (
          <p className="text-xs text-destructive" role="alert">
            The two passwords don't match.
          </p>
        )}
      </div>
      <Button type="submit" loading={change.isPending} disabled={!canSubmit}>
        Change password
      </Button>
    </form>
  );
}
