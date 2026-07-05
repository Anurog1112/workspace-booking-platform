import { Role } from "@prisma/client";
import { z } from "zod";

export const updateUserRoleSchema = z.object({
  profileId: z.string().min(1),
  role: z.nativeEnum(Role),
});

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(30).optional(),
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
