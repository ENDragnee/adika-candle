import { auth } from "./auth";

// Lets a Manager set (or overwrite) any user's password directly, without
// knowing their current one — the same job better-auth's `admin` plugin's
// `setUserPassword` endpoint does, reimplemented here against `auth.$context`
// directly instead of enabling that plugin. The admin plugin's own
// `databaseHooks.user.create.before` hook writes a plain `role: string`
// field onto every created User, which collides with this app's own
// Role/Permission/Module RBAC tables (no such column on `User`) — see
// docs/DECISIONS.md. Every user in this app is created via
// `auth.api.signUpEmail`, so a credential Account always already exists;
// the `createAccount` branch mirrors the admin plugin's own fallback for
// completeness, not because this app is expected to hit it.
export async function SetUserPassword(
  userId: string,
  newPassword: string,
): Promise<void> {
  const ctx = await auth.$context;
  const hashedPassword = await ctx.password.hash(newPassword);
  const existingAccount =
    await ctx.internalAdapter.findCredentialAccount(userId);

  if (existingAccount) {
    await ctx.internalAdapter.updatePassword(userId, hashedPassword);
    return;
  }

  const user = await ctx.internalAdapter.findUserById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  await ctx.internalAdapter.createAccount({
    userId,
    providerId: "credential",
    accountId: user.id,
    password: hashedPassword,
  });
}
