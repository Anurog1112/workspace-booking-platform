import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { getDemoAuthUser, getDemoUserByEmail, getDemoUserById, isDemoMode } from "@/lib/demo-mode";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { signInSchema } from "@/server/validators/auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: isDemoMode ? undefined : PrismaAdapter(prisma),
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
        };
      },
    }),
  ],
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

        return token;
      }

      const profile = await prisma.profile.findUnique({
        where: { userId },
        select: { id: true, role: true },
      });

      token.sub = userId;
      token.profileId = profile?.id;
      token.role = profile?.role;

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
