"use server";

import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireRole } from "@/server/guards";
import { cancelOwnPendingBooking, createBooking } from "@/server/services/booking-service";
import { submitPaymentProof } from "@/server/services/payment-service";
import { createBookingSchema } from "@/server/validators/booking";
import { submitPaymentProofSchema } from "@/server/validators/payment";

function getActionErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "The action could not be completed.";
}

export async function createBookingAction(formData: FormData) {
  const context = await requireRole([Role.MEMBER, Role.STAFF, Role.SUPER_ADMIN]);
  let target = "/member?created=1";

  try {
    const parsed = createBookingSchema.parse({
      roomId: formData.get("roomId"),
      startAt: formData.get("startAt"),
      endAt: formData.get("endAt"),
      attendeeCount: formData.get("attendeeCount"),
      purpose: formData.get("purpose") || undefined,
    });

    await createBooking(context.profile.id, parsed);
  } catch (error) {
    target = `/member?error=${encodeURIComponent(getActionErrorMessage(error))}`;
  }

  revalidatePath("/member");
  redirect(target);
}

export async function submitPaymentProofAction(formData: FormData) {
  const context = await requireRole([Role.MEMBER, Role.STAFF, Role.SUPER_ADMIN]);
  let target = "/member?paymentSubmitted=1";

  try {
    const parsed = submitPaymentProofSchema.parse({
      bookingId: formData.get("bookingId"),
      proofFileUrl: formData.get("proofFileUrl"),
    });

    await submitPaymentProof(context.profile.id, parsed);
  } catch (error) {
    target = `/member?error=${encodeURIComponent(getActionErrorMessage(error))}`;
  }

  revalidatePath("/member");
  redirect(target);
}

export async function cancelBookingAction(formData: FormData) {
  const context = await requireRole([Role.MEMBER, Role.STAFF, Role.SUPER_ADMIN]);
  const bookingId = z.string().min(1).parse(formData.get("bookingId"));

  await cancelOwnPendingBooking(context.profile.id, bookingId);
  revalidatePath("/member");
}
