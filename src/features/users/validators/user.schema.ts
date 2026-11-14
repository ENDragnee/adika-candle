import { z } from "zod";
import type { Role, User } from "@/generated/prisma/client";
import { IsWithinReach } from "@/lib/access-rules";
import { FailedPasswordRules } from "@/lib/password-policy";

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  username: z.string().nullable(),
  isActive: z.boolean(),
  roleId: z.string().nullable(),
  roleName: z.string().nullable(),
  // Whether the person viewing the list may change this account: false
  // when its role holds access the viewer's own role doesn't (see
  // src/lib/server/access-containment.ts). The API enforces it either way.
  canManage: z.boolean(),
  // Locked after repeated failed sign-ins until this time (Epic 24);
  // null or in the past = not locked.
  lockedUntil: z.iso.datetime().nullable(),
  // Must pick a new password at next sign-in (Epic 24).
  mustChangePassword: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type UserDTO = z.infer<typeof UserSchema>;

export const UserListResponseSchema = z.array(UserSchema);

export const UserNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(160, "Keep the name under 160 characters");

// Same rules as better-auth's username plugin (3–30 characters; letters,
// digits, underscore and dot), so an account renamed here can still sign
// in. Usernames are compared case-insensitively.
export const UsernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be at most 30 characters")
  .regex(
    /^[a-zA-Z0-9_.]+$/,
    "Username can only use letters, numbers, underscores and dots",
  );

// The shared password policy (src/lib/password-policy.ts, Epic 22) — the
// same rules the form's live checklist shows. Rules about the person's
// own name/username are checked where the account is known (the routes).
export const PasswordSchema = z.string().superRefine((password, ctx) => {
  for (const rule of FailedPasswordRules(password)) {
    ctx.addIssue({ code: "custom", message: `Password: ${rule.label}` });
  }
});

export const CreateUserInputSchema = z.object({
  name: UserNameSchema,
  email: z.email(),
  username: UsernameSchema,
  roleId: z.string().min(1, "Role is required"),
  // The Manager sets this directly — see docs/DECISIONS.md for why this
  // reverses Epic 7's original "auto-generated temp password" decision.
  password: PasswordSchema,
  // The person replaces this password at first sign-in (Epic 24).
  requirePasswordChange: z.boolean().default(true),
});

export type CreateUserInput = z.input<typeof CreateUserInputSchema>;

// Email stays fixed: sign-in is by username, and email is the account's
// stable identity in better-auth.
export const UpdateUserInputSchema = z.object({
  name: UserNameSchema.optional(),
  username: UsernameSchema.optional(),
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
    // The person must replace this password at next sign-in (Epic 24).
    // Ignored when setting your own.
    requirePasswordChange: z.boolean().default(true),
  })
  .refine((input) => input.password === input.confirmPassword, {
    message: "The two passwords don't match",
    path: ["confirmPassword"],
  });

export type SetUserPasswordInput = z.input<typeof SetUserPasswordInputSchema>;

type UserWithRole = User & {
  role: (Role & { permissions: { name: string }[] }) | null;
};

// `viewerPermissions` decides `canManage` (Epic 23 access containment).
export function ToUserDTO(
  user: UserWithRole,
  viewerPermissions: readonly string[],
): UserDTO {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    isActive: user.isActive,
    roleId: user.roleId,
    roleName: user.role?.name ?? null,
    lockedUntil:
      user.lockedUntil && user.lockedUntil > new Date()
        ? user.lockedUntil.toISOString()
        : null,
    mustChangePassword: user.mustChangePassword,
    canManage: IsWithinReach(
      viewerPermissions,
      user.role?.permissions.map((permission) => permission.name) ?? [],
    ),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export const WITH_ROLE_INCLUDE = {
  role: { include: { permissions: { select: { name: true } } } },
} as const;
