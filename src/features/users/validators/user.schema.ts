import { z } from "zod";
import type { Role, User } from "@/generated/prisma/client";
import { FailedPasswordRules } from "@/lib/password-policy";

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  username: z.string().nullable(),
  isActive: z.boolean(),
  roleId: z.string().nullable(),
  roleName: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type UserDTO = z.infer<typeof UserSchema>;

export const UserListResponseSchema = z.array(UserSchema);

// The shared password policy (src/lib/password-policy.ts, Epic 22) — the
// same rules the form's live checklist shows. Rules about the person's
// own name/username are checked where the account is known (the routes).
const PasswordSchema = z.string().superRefine((password, ctx) => {
  for (const rule of FailedPasswordRules(password)) {
    ctx.addIssue({ code: "custom", message: `Password: ${rule.label}` });
  }
});

export const CreateUserInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(160),
  email: z.email(),
  username: z.string().trim().min(1, "Username is required").max(60),
  roleId: z.string().min(1, "Role is required"),
  // The Manager sets this directly — see docs/DECISIONS.md for why this
  // reverses Epic 7's original "auto-generated temp password" decision.
  password: PasswordSchema,
});

export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;

// roleId/isActive only — name/email/username aren't editable from this UI.
export const UpdateUserInputSchema = z.object({
  roleId: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateUserInput = z.infer<typeof UpdateUserInputSchema>;

export const SetUserPasswordInputSchema = z
  .object({
    password: PasswordSchema,
    confirmPassword: z.string(),
    // Ends every existing session for the account, so whoever knew the
    // old password (or holds a stolen session) is signed out now.
    signOutEverywhere: z.boolean().default(true),
  })
  .refine((input) => input.password === input.confirmPassword, {
    message: "The two passwords don't match",
    path: ["confirmPassword"],
  });

export type SetUserPasswordInput = z.input<typeof SetUserPasswordInputSchema>;

type UserWithRole = User & { role: Role | null };

export function ToUserDTO(user: UserWithRole): UserDTO {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    isActive: user.isActive,
    roleId: user.roleId,
    roleName: user.role?.name ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export const WITH_ROLE_INCLUDE = {
  role: true,
} as const;
