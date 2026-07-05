"use server";

import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/server/guards";
import { updateUserRole } from "@/server/services/user-service";
import { updateUserRoleSchema } from "@/server/validators/user";

export async function updateUserRoleAction(formData: FormData) {
  const context = await requireRole([Role.SUPER_ADMIN]);

  const parsed = updateUserRoleSchema.parse({
    profileId: formData.get("profileId"),
    role: formData.get("role"),
  });

  try {
    await updateUserRole(context.profile.id, parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Role update failed.";
    redirect(`/admin/users?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/admin/users");
  redirect("/admin/users?updated=1");
}
