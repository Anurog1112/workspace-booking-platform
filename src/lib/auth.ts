import { PrismaAdapter } from "@auth/prisma-adapter";
import { Role } from "@prisma/client";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { cache } from "react";

import { getDemoAuthUser, getDemoUserByEmail, getDemoUserById, isDemoMode } from "@/lib/demo-mode";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { signInSchema } from "@/server/validators/auth";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const ROLE_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

const nextAuth = NextAuth({
  adapter: isDemoMode ? undefined : PrismaAdapter(prisma),
  trustHost: true,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = signInSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        if (isDemoMode) {
          return getDemoAuthUser(parsed.data.email, parsed.data.password);
        }

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          include: { profile: true },
        });

        if (!user?.email || !user.passwordHash) {
          return null;
        }

        const isValidPassword = verifyPassword(parsed.data.password, user.passwordHash);

        if (!isValidPassword) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.profile?.fullName ?? user.email,
          image: user.image,
          profileId: user.profile?.id,
          role: user.profile?.role,
        };
      },
    }),
    ...(googleClientId && googleClientSecret
      ? [
          Google({
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],
  events: {
    async createUser({ user }) {
      if (isDemoMode || !user.id) {
        return;
      }

      await prisma.profile.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          fullName: user.name ?? user.email ?? "Workspace member",
          role: Role.MEMBER,
        },
      });
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      const userId = user?.id ?? token.sub;

      if (!userId) {
        return token;
      }

      if (isDemoMode) {
        const demoUser = user?.email ? getDemoUserByEmail(user.email) : getDemoUserById(userId);

        token.sub = demoUser?.userId ?? userId;
        token.profileId = demoUser?.profileId;
        token.role = demoUser?.role;
        token.roleCheckedAt = Date.now();

        return token;
      }

      if (user?.profileId && user.role) {
        token.sub = userId;
        token.profileId = user.profileId;
        token.role = user.role;
        token.roleCheckedAt = Date.now();

        return token;
      }

      const roleIsStale = !token.roleCheckedAt || Date.now() - token.roleCheckedAt > ROLE_REFRESH_INTERVAL_MS;

      if (!token.profileId || !token.role || roleIsStale) {
        const profile = await prisma.profile.findUnique({
          where: { userId },
          select: { id: true, role: true },
        });

        token.profileId = profile?.id;
        token.role = profile?.role;
        token.roleCheckedAt = Date.now();
      }

      token.sub = userId;

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.profileId = token.profileId;
        session.user.role = token.role;
      }

      return session;
    },
  },
});

export const { handlers, signIn, signOut } = nextAuth;
export const auth = cache(nextAuth.auth);

export const isGoogleAuthEnabled = Boolean(googleClientId && googleClientSecret);
