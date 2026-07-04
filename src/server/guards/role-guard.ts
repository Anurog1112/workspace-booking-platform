import type { Role } from "@prisma/client";

import { assertRole, ForbiddenError, requireAuth } from "@/server/guards/auth-guard";

export async function requireRole(allowedRoles: Role[]) {
  const context = await requireAuth();
  assertRole(context.profile, allowedRoles);

  return context;
}

export async function requireOwnerOrRole(ownerProfileId: string, allowedRoles: Role[]) {
  const context = await requireAuth();

  if (context.profile.id === ownerProfileId) {
    return context;
  }

  if (allowedRoles.includes(context.profile.role)) {
    return context;
  }

  throw new ForbiddenError();
}