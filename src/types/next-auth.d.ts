import type { Role } from "@prisma/client";
import type { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface User extends DefaultUser {
    profileId?: string;
    role?: Role;
  }

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
    roleCheckedAt?: number;
  }
}
