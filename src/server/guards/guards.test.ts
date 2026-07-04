import { Role } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockAuth, mockPrisma } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockPrisma: {
    profile: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { AuthRequiredError, ForbiddenError, assertRole, requireAuth } from "@/server/guards/auth-guard";
import { requireOwnerOrRole, requireRole } from "@/server/guards/role-guard";

describe("guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated user", async () => {
    mockAuth.mockResolvedValueOnce(null);

    await expect(requireAuth()).rejects.toBeInstanceOf(AuthRequiredError);
    expect(mockPrisma.profile.findUnique).not.toHaveBeenCalled();
  });

  it("rejects authenticated user without profile", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "user_1" } });
    mockPrisma.profile.findUnique.mockResolvedValueOnce(null);

    await expect(requireAuth()).rejects.toBeInstanceOf(AuthRequiredError);
  });

  it("allows authenticated user with profile", async () => {
    const profile = { id: "profile_1", userId: "user_1", role: Role.MEMBER };
    mockAuth.mockResolvedValueOnce({ user: { id: "user_1" } });
    mockPrisma.profile.findUnique.mockResolvedValueOnce(profile);

    await expect(requireAuth()).resolves.toEqual({
      userId: "user_1",
      profile,
    });
  });

  it("rejects role outside allowlist", () => {
    expect(() => assertRole({ role: Role.MEMBER }, [Role.STAFF])).toThrow(ForbiddenError);
  });

  it("allows required role", async () => {
    const profile = { id: "profile_1", userId: "user_1", role: Role.STAFF };
    mockAuth.mockResolvedValueOnce({ user: { id: "user_1" } });
    mockPrisma.profile.findUnique.mockResolvedValueOnce(profile);

    await expect(requireRole([Role.STAFF, Role.SUPER_ADMIN])).resolves.toEqual({
      userId: "user_1",
      profile,
    });
  });

  it("allows owner even when role is not allowed", async () => {
    const profile = { id: "profile_1", userId: "user_1", role: Role.MEMBER };
    mockAuth.mockResolvedValueOnce({ user: { id: "user_1" } });
    mockPrisma.profile.findUnique.mockResolvedValueOnce(profile);

    await expect(requireOwnerOrRole("profile_1", [Role.STAFF])).resolves.toEqual({
      userId: "user_1",
      profile,
    });
  });

  it("rejects non-owner without allowed role", async () => {
    const profile = { id: "profile_1", userId: "user_1", role: Role.MEMBER };
    mockAuth.mockResolvedValueOnce({ user: { id: "user_1" } });
    mockPrisma.profile.findUnique.mockResolvedValueOnce(profile);

    await expect(requireOwnerOrRole("profile_2", [Role.STAFF])).rejects.toBeInstanceOf(ForbiddenError);
  });
});
