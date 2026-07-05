"use server";

import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/server/guards";
import { reviewPayment } from "@/server/services/payment-service";
import { reviewPaymentSchema } from "@/server/validators/payment";

export async function reviewPaymentAction(formData: FormData) {
  const context = await requireRole([Role.STAFF, Role.SUPER_ADMIN]);
  let target = "/staff?reviewed=1";

  try {
    const parsed = reviewPaymentSchema.parse({
      bookingId: formData.get("bookingId"),
      approved: formData.get("approved") === "true",
      rejectionReason: formData.get("rejectionReason") || undefined,
    });

    await reviewPayment(context.profile.id, parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payment review could not be completed.";
    target = `/staff?error=${encodeURIComponent(message)}`;
  }

  revalidatePath("/staff");
  redirect(target);
}
