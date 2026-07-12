"use server";

import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { combineBranchDateTime } from "@/lib/branch-time";
import { requireRole } from "@/server/guards";
import { BookingConflictError, BookingValidationError, cancelOwnPendingBooking, createBooking } from "@/server/services/booking-service";
import { submitPaymentProof } from "@/server/services/payment-service";
import { uploadPaymentProof } from "@/server/services/upload-service";
import { createBookingSchema } from "@/server/validators/booking";
import { submitPaymentProofSchema } from "@/server/validators/payment";

function getActionErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "The action could not be completed.";
}

function getBookingDateRange(formData: FormData) {
  const bookingDate = formData.get("bookingDate");
  const startTime = formData.get("startTime");
  const endTime = formData.get("endTime");

  if (typeof bookingDate === "string" && typeof startTime === "string" && typeof endTime === "string" && bookingDate && startTime && endTime) {
    return {
      startAt: combineBranchDateTime(bookingDate, startTime),
      endAt: combineBranchDateTime(bookingDate, endTime),
    };
  }

  return {
    startAt: formData.get("startAt"),
    endAt: formData.get("endAt"),
  };
}

export type CreateBookingActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  bookingId?: string;
  fieldErrors?: Partial<Record<"bookingDate" | "startTime" | "endTime" | "attendeeCount" | "purpose", string[]>>;
};

export async function createBookingAction(_previousState: CreateBookingActionState, formData: FormData): Promise<CreateBookingActionState> {
  const context = await requireRole([Role.MEMBER, Role.STAFF, Role.SUPER_ADMIN]);

  try {
    const dateRange = getBookingDateRange(formData);
    const parsed = createBookingSchema.safeParse({
      roomId: formData.get("roomId"),
      startAt: dateRange.startAt,
      endAt: dateRange.endAt,
      attendeeCount: formData.get("attendeeCount"),
      purpose: formData.get("purpose") || undefined,
    });

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;

      return {
        status: "error",
        message: "Please check the highlighted booking details.",
        fieldErrors: {
          bookingDate: errors.startAt,
          startTime: errors.startAt,
          endTime: errors.endAt,
          attendeeCount: errors.attendeeCount,
          purpose: errors.purpose,
        },
      };
    }

    const booking = await createBooking(context.profile.id, parsed.data);
    revalidatePath("/member");
    revalidatePath("/member/bookings");
    revalidatePath("/dashboard");

    return {
      status: "success",
      message: "Your room is reserved. Complete payment before the deadline to keep this booking.",
      bookingId: booking.id,
    };
  } catch (error) {
    if (error instanceof BookingValidationError || error instanceof BookingConflictError) {
      return { status: "error", message: error.message };
    }

    console.error("Booking creation failed.", error);
    return { status: "error", message: "Booking could not be completed. Please try again." };
  }
}

export async function submitPaymentProofAction(formData: FormData) {
  const context = await requireRole([Role.MEMBER, Role.STAFF, Role.SUPER_ADMIN]);
  let target = "/member/bookings?paymentSubmitted=1";

  try {
    const proofFile = formData.get("proofFile");
    const proofFileUrl =
      proofFile instanceof File && proofFile.size > 0 ? await uploadPaymentProof(proofFile, context.profile.id) : formData.get("proofFileUrl");

    const parsed = submitPaymentProofSchema.parse({
      bookingId: formData.get("bookingId"),
      proofFileUrl,
    });

    await submitPaymentProof(context.profile.id, parsed);
  } catch (error) {
    target = `/member/bookings?error=${encodeURIComponent(getActionErrorMessage(error))}`;
  }

  revalidatePath("/member");
  revalidatePath("/member/bookings");
  redirect(target);
}

export async function cancelBookingAction(formData: FormData) {
  const context = await requireRole([Role.MEMBER, Role.STAFF, Role.SUPER_ADMIN]);
  let target = "/member/bookings?cancelled=1";

  try {
    const bookingId = z.string().min(1).parse(formData.get("bookingId"));
    await cancelOwnPendingBooking(context.profile.id, bookingId);
  } catch (error) {
    target = `/member/bookings?error=${encodeURIComponent(getActionErrorMessage(error))}`;
  }

  revalidatePath("/member");
  revalidatePath("/member/bookings");
  redirect(target);
}
