import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      profileId?: string;
      role?: Role;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    profileId?: string;
    role?: Role;
  }
}