"use server";

import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/server/guards";
import { updateUserRole } from "@/server/services/user-service";
import { updateUserRoleSchema } from "@/server/validators/user";

export async function updateUserRoleAction(formData: FormData) {
  const context = await requireRole([Role.SUPER_ADMIN]);
  let target = "/admin/users?updated=1";

  try {
    const parsed = updateUserRoleSchema.parse({
      profileId: formData.get("profileId"),
      role: formData.get("role"),
    });

    await updateUserRole(context.profile.id, parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Role update failed.";
    target = `/admin/users?error=${encodeURIComponent(message)}`;
  }

  revalidatePath("/admin/users");
  redirect(target);
}
