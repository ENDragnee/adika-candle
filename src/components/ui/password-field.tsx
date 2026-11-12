"use client";

import { CheckCircleIcon, CircleIcon } from "@phosphor-icons/react";
import { PasswordInput } from "@/components/ui/password-input";
import {
  FailedPasswordRules,
  PASSWORD_MAX,
  PASSWORD_RULES,
  type PasswordContext,
} from "@/lib/password-policy";
import { cn } from "@/lib/utils";

// A new-password input with a live checklist of the password rules
// (Epic 22) — the same rules the API enforces, so what passes here is
// accepted there. The checklist appears once the person starts typing.
export function PasswordField({
  id,
  label,
  value,
  onChange,
  context,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  context?: PasswordContext;
}) {
  const failed = new Set(
    FailedPasswordRules(value, context).map((rule) => rule.id),
  );
  const passed = PASSWORD_RULES.length - failed.size;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <PasswordInput
        id={id}
        autoComplete="new-password"
        maxLength={PASSWORD_MAX}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={`${id}-rules`}
        aria-invalid={value.length > 0 && failed.size > 0}
        required
      />
      {value.length > 0 && (
        <>
          <div
            className="flex gap-1"
            role="meter"
            aria-label="Password strength"
            aria-valuemin={0}
            aria-valuemax={PASSWORD_RULES.length}
            aria-valuenow={passed}
          >
            {PASSWORD_RULES.map((rule, index) => (
              <span
                key={rule.id}
                className="h-1 flex-1 rounded-full bg-muted transition-colors"
                style={
                  index < passed
                    ? {
                        backgroundColor:
                          failed.size === 0
                            ? "var(--color-status-good)"
                            : "var(--color-status-warning)",
                      }
                    : undefined
                }
              />
            ))}
          </div>
          <ul id={`${id}-rules`} className="flex flex-col gap-0.5 text-xs">
            {PASSWORD_RULES.map((rule) => {
              const ok = !failed.has(rule.id);
              const Icon = ok ? CheckCircleIcon : CircleIcon;
              return (
                <li
                  key={rule.id}
                  className={cn(
                    "flex items-center gap-1.5",
                    ok ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  <Icon
                    weight={ok ? "fill" : "regular"}
                    className="size-3.5"
                    style={
                      ok ? { color: "var(--color-status-good)" } : undefined
                    }
                  />
                  {rule.label}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

export function PasswordIsValid(value: string, context?: PasswordContext) {
  return FailedPasswordRules(value, context).length === 0;
}
