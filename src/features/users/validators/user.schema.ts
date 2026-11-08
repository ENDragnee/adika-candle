import { z } from "zod";
import type { Role, User } from "@/generated/prisma/client";

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

export const CreateUserInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(160),
  email: z.email(),
  username: z.string().trim().min(1, "Username is required").max(60),
  roleId: z.string().min(1, "Role is required"),
});

export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;

// A temporary password is generated server-side and returned exactly once
// in the create response — there's no password field on the create form.
// See docs/DECISIONS.md, "Epic 7 decisions".
export const CreateUserResponseSchema = z.object({
  user: UserSchema,
  temporaryPassword: z.string(),
});

export type CreateUserResponse = z.infer<typeof CreateUserResponseSchema>;

// roleId/isActive only — name/email/username aren't editable from this UI.
export const UpdateUserInputSchema = z.object({
  roleId: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateUserInput = z.infer<typeof UpdateUserInputSchema>;

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
