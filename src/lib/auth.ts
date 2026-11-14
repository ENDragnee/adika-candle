import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { customSession, username } from "better-auth/plugins";
import { SESSION_MAX_AGE } from "@/configs/global-vars";
import {
  AuthActivityAfterHook,
  AuthActivityBeforeHook,
} from "./activity/auth-activity";
import { prisma } from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),

  // Login is by username, not email — better-auth's username plugin still
  // requires the underlying email/password provider to be enabled.
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },

  session: {
    expiresIn: SESSION_MAX_AGE,
  },

  // Activity log entries for sign-in, failed sign-in and sign-out
  // (Epic 22).
  hooks: {
    before: AuthActivityBeforeHook,
    after: AuthActivityAfterHook,
  },

  plugins: [
    username(),
    customSession(async ({ user, session }) => {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          isActive: true,
          mustChangePassword: true,
          role: {
            select: { name: true, permissions: { select: { name: true } } },
          },
        },
      });

      // A deactivated user keeps a valid better-auth session (sign-in
      // itself isn't blocked) but loses role/permissions here, so every
      // CheckPermission/CheckAnyPermission call and the ManagerLayout/
      // InventoryLayout role gates reject them on their next request. See
      // docs/DECISIONS.md, "Epic 7 decisions".
      if (!dbUser?.isActive) {
        return {
          user: {
            ...user,
            role: null,
            permissions: [] as string[],
            mustChangePassword: false,
          },
          session,
        };
      }

      // Someone else chose this password (Epic 24): no permissions until
      // the person picks their own. The dashboard layout and
      // RoleRedirector send them to /account/change-password.
      if (dbUser.mustChangePassword) {
        return {
          user: {
            ...user,
            role: dbUser.role?.name ?? null,
            permissions: [] as string[],
            mustChangePassword: true,
          },
          session,
        };
      }

      return {
        user: {
          ...user,
          role: dbUser.role?.name ?? null,
          permissions:
            dbUser.role?.permissions.map((permission) => permission.name) ?? [],
          mustChangePassword: false,
        },
        session,
      };
    }),
  ],
});

export type AppSession = typeof auth.$Infer.Session;
export type AppUser = AppSession["user"];
