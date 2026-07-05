import { Role } from "@prisma/client";

import { demoUsers, isDemoMode } from "@/lib/demo-mode";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import type { RegisterInput } from "@/server/validators/auth";
import type { UpdateUserRoleInput } from "@/server/validators/user";

export class UserValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserValidationError";
  }
}

export async function registerMember(input: RegisterInput) {
  if (isDemoMode) {
    return {
      id: "demo-user-registered",
      email: input.email,
      name: input.fullName,
    };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });

  if (existingUser) {
    throw new UserValidationError("This email is already registered.");
  }

  return prisma.user.create({
    data: {
      email: input.email,
      name: input.fullName,
      passwordHash: hashPassword(input.password),
      profile: {
        create: {
          fullName: input.fullName,
          phone: input.phone,
          role: Role.MEMBER,
        },
      },
    },
  });
}

export async function listUsers(filters: { q?: string } = {}) {
  if (isDemoMode) {
    const query = filters.q?.toLowerCase();

    return demoUsers
      .filter((user) => !query || user.email.includes(query) || user.fullName.toLowerCase().includes(query))
      .map((user) => ({
        id: user.profileId,
        userId: user.userId,
        fullName: user.fullName,
        phone: null,
        role: user.role,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: user.userId,
          email: user.email,
          name: user.fullName,
        },
      }));
  }

  return prisma.profile.findMany({
    where: filters.q
      ? {
          OR: [
            { fullName: { contains: filters.q, mode: "insensitive" } },
            { phone: { contains: filters.q, mode: "insensitive" } },
            { user: { email: { contains: filters.q, mode: "insensitive" } } },
          ],
        }
      : undefined,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
    orderBy: [{ role: "asc" }, { fullName: "asc" }],
  });
}

export async function updateUserRole(actorProfileId: string, input: UpdateUserRoleInput) {
  if (actorProfileId === input.profileId && input.role !== Role.SUPER_ADMIN) {
    throw new UserValidationError("You cannot remove your own super admin access.");
  }

  if (isDemoMode) {
    return {
      id: input.profileId,
      role: input.role,
    };
  }

  return prisma.profile.update({
    where: { id: input.profileId },
    data: { role: input.role },
  });
}
