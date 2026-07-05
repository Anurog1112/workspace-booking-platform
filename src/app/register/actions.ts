"use server";

import { redirect } from "next/navigation";

import { registerMember } from "@/server/services/user-service";
import { registerSchema } from "@/server/validators/auth";

export async function registerAction(formData: FormData) {
  const parsed = registerSchema.parse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
    phone: formData.get("phone") || undefined,
  });

  await registerMember(parsed);
  redirect("/login?registered=1");
}
