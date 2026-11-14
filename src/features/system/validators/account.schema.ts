import { z } from "zod";
import { PasswordSchema } from "@/features/users/validators/user.schema";

// Changing your own password (Epic 24) — required after someone else set
// it, and available any time from the account menu.
export const ChangeOwnPasswordInputSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    password: PasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((input) => input.password === input.confirmPassword, {
    message: "The two passwords don't match",
    path: ["confirmPassword"],
  })
  .refine((input) => input.password !== input.currentPassword, {
    message: "Choose a password different from your current one",
    path: ["password"],
  });

export type ChangeOwnPasswordInput = z.infer<
  typeof ChangeOwnPasswordInputSchema
>;
