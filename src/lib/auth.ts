import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { customSession, username } from "better-auth/plugins";
import { SESSION_MAX_AGE } from "@/configs/global-vars";
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

  plugins: [
    username(),
    customSession(async ({ user, session }) => {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          role: {
            select: { name: true, permissions: { select: { name: true } } },
          },
        },
      });

      return {
        user: {
          ...user,
          role: dbUser?.role?.name ?? null,
          permissions:
            dbUser?.role?.permissions.map((permission) => permission.name) ??
            [],
        },
        session,
      };
    }),
  ],
});

export type AppSession = typeof auth.$Infer.Session;
export type AppUser = AppSession["user"];
