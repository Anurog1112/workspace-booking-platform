import { BookingStatus, PaymentStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { ReviewPaymentInput, SubmitPaymentProofInput } from "@/server/validators/payment";

export class PaymentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentValidationError";
  }
}

export async function submitPaymentProof(memberId: string, input: SubmitPaymentProofInput) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: input.bookingId },
      include: { payment: true },
    });

    if (!booking || booking.memberId !== memberId) {
      throw new PaymentValidationError("Booking not found.");
    }

    if (!booking.payment) {
      throw new PaymentValidationError("Payment record not found.");
    }

    if (booking.paymentDueAt <= new Date()) {
      throw new PaymentValidationError("Payment deadline has passed.");
    }

    const allowedStatuses: BookingStatus[] = [BookingStatus.PENDING_PAYMENT, BookingStatus.REJECTED];

    if (!allowedStatuses.includes(booking.status)) {
      throw new PaymentValidationError("Payment proof cannot be submitted for this booking.");
    }

    await tx.payment.update({
      where: { bookingId: input.bookingId },
      data: {
        proofFileUrl: input.proofFileUrl,
        status: PaymentStatus.PENDING_REVIEW,
        rejectionReason: null,
      },
    });

    return tx.booking.update({
      where: { id: input.bookingId },
      data: { status: BookingStatus.PENDING_REVIEW },
      include: { payment: true },
    });
  });
}

export async function reviewPayment(staffProfileId: string, input: ReviewPaymentInput) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: input.bookingId },
      include: { payment: true },
    });

    if (!booking?.payment || booking.payment.status !== PaymentStatus.PENDING_REVIEW) {
      throw new PaymentValidationError("Payment is not pending review.");
    }

    const paymentStatus = input.approved ? PaymentStatus.APPROVED : PaymentStatus.REJECTED;
    const bookingStatus = input.approved ? BookingStatus.CONFIRMED : BookingStatus.REJECTED;

    await tx.payment.update({
      where: { bookingId: input.bookingId },
      data: {
        status: paymentStatus,
        reviewedById: staffProfileId,
        reviewedAt: new Date(),
        rejectionReason: input.approved ? null : input.rejectionReason,
      },
    });

    return tx.booking.update({
      where: { id: input.bookingId },
      data: { status: bookingStatus },
      include: { payment: true },
    });
  });
}
