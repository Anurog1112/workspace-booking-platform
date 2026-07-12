import type { Role } from "@prisma/client";

import { auth } from "@/lib/auth";
import { getDemoProfileByUserId, isDemoMode } from "@/lib/demo-mode";

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
  profile: {
    id: string;
    userId: string;
    role: Role;
  };
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

  if (!session.user.profileId || !session.user.role) {
    throw new AuthRequiredError();
  }

  return {
    userId: session.user.id,
    profile: {
      id: session.user.profileId,
      userId: session.user.id,
      role: session.user.role,
    },
  };
}

export function assertRole(profile: { role: Role }, allowedRoles: Role[]) {
  if (!allowedRoles.includes(profile.role)) {
    throw new ForbiddenError();
  }
}
