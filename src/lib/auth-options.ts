import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import { getUserAgent } from "./user-agent";
import { randomBytes } from "crypto";
import { getServerSession } from "next-auth";
import { UserNameSignIn } from "@/features/auth/services/sigin.service";
import { SESSION_MAX_AGE } from "@/configs/global-vars";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        userName: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: UserNameSignIn,
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE,
  },

  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const { userAgent, ip } = await getUserAgent();
        const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);
        const sessionToken = randomBytes(32).toString("hex");

        await prisma.session.create({
          data: {
            userId: user.id,
            userAgent,
            ipAddress: ip,
            expiresAt,
            sessionToken,
          },
        });

        token.id = user.id;
        token.name = user.name;
        token.role = user.role;
        token.permissions = user.permissions;
        token.token = sessionToken;
        token.invalid = false;
        token.exp = Math.floor(expiresAt.getTime() / 1000);
      }

      if (!token.token) {
        token.invalid = true;
        return token;
      }

      const dbSession = await prisma.session.findUnique({
        where: { sessionToken: token.token },
        select: { expiresAt: true },
      });

      if (!dbSession || dbSession.expiresAt < new Date()) {
        token.invalid = true;
      }

      return token;
    },

    async session({ session, token }) {
      if (token.invalid) {
        session.user = undefined;
        session.expires = new Date(0).toISOString();
        return session;
      }

      if (session.user && token.id) {
        session.user.id = token.id;
        session.user.name = token.name;
        session.user.role = token.role;
        session.user.permissions = token.permissions;
      }
      return session;
    },
  },

  events: {
    async signIn({ user }) {
      await prisma.log.create({
        data: {
          type: "AUTH_LOGIN_SUCCESS",
          severity: "INFO",
          message: `User ${user.userName} successfully logged in.`,
          userId: user.id,
        },
      });
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

export default NextAuth(authOptions);

export const getActionSession = async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Not authenticated");
  }
  return session.user;
};

export const checkPermission = async (
  permissionName: string,
): Promise<boolean> => {
  try {
    const user = await getActionSession();
    return user.permissions?.includes(permissionName) || false;
  } catch (error) {
    return false;
  }
};

export const checkAnyPermission = async (
  permissionNames: string[],
): Promise<boolean> => {
  try {
    const user = await getActionSession();
    return permissionNames.some((perm) => user.permissions?.includes(perm));
  } catch (error) {
    return false;
  }
};
