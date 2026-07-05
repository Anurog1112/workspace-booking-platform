import type { Profile, Role } from "@prisma/client";

import { auth } from "@/lib/auth";
import { getDemoProfileByUserId, isDemoMode } from "@/lib/demo-mode";
import { prisma } from "@/lib/prisma";

export class AuthRequiredError extends Error {
  constructor() {
    super("Authentication is required.");
    this.name = "AuthRequiredError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export type AuthContext = {
  userId: string;
  profile: Profile;
};

export async function requireAuth(): Promise<AuthContext> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new AuthRequiredError();
  }

  if (isDemoMode) {
    const profile = getDemoProfileByUserId(session.user.id);

    if (!profile) {
      throw new AuthRequiredError();
    }

    return {
      userId: session.user.id,
      profile,
    };
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
  });

  if (!profile) {
    throw new AuthRequiredError();
  }

  return {
    userId: session.user.id,
    profile,
  };
}

export function assertRole(profile: Pick<Profile, "role">, allowedRoles: Role[]) {
  if (!allowedRoles.includes(profile.role)) {
    throw new ForbiddenError();
  }
}
