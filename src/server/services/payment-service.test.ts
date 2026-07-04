import { BookingStatus, PaymentStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    booking: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    payment: {
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import {
  PaymentValidationError,
  reviewPayment,
  submitPaymentProof,
} from "@/server/services/payment-service";

describe("payment-service", () => {
  function futurePaymentDueAt() {
    return new Date(Date.now() + 30 * 60 * 1000);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(async (callback) => callback(mockPrisma));
  });

  it("submits payment proof and moves booking to pending review", async () => {
    mockPrisma.booking.findUnique.mockResolvedValueOnce({
      id: "booking_1",
      memberId: "member_1",
      status: BookingStatus.PENDING_PAYMENT,
      paymentDueAt: futurePaymentDueAt(),
      payment: { id: "payment_1" },
    });
    mockPrisma.booking.update.mockResolvedValueOnce({
      id: "booking_1",
      status: BookingStatus.PENDING_REVIEW,
    });

    await submitPaymentProof("member_1", {
      bookingId: "booking_1",
      proofFileUrl: "https://example.com/proof.png",
    });

    expect(mockPrisma.payment.update).toHaveBeenCalledWith({
      where: { bookingId: "booking_1" },
      data: {
        proofFileUrl: "https://example.com/proof.png",
        status: PaymentStatus.PENDING_REVIEW,
        rejectionReason: null,
      },
    });
    expect(mockPrisma.booking.update).toHaveBeenCalledWith({
      where: { id: "booking_1" },
      data: { status: BookingStatus.PENDING_REVIEW },
      include: { payment: true },
    });
  });

  it("rejects payment proof for a booking owned by another member", async () => {
    mockPrisma.booking.findUnique.mockResolvedValueOnce({
      id: "booking_1",
      memberId: "member_2",
      status: BookingStatus.PENDING_PAYMENT,
      paymentDueAt: futurePaymentDueAt(),
      payment: { id: "payment_1" },
    });

    await expect(
      submitPaymentProof("member_1", {
        bookingId: "booking_1",
        proofFileUrl: "https://example.com/proof.png",
      }),
    ).rejects.toBeInstanceOf(PaymentValidationError);
    expect(mockPrisma.payment.update).not.toHaveBeenCalled();
  });

  it("rejects payment proof after payment deadline", async () => {
    mockPrisma.booking.findUnique.mockResolvedValueOnce({
      id: "booking_1",
      memberId: "member_1",
      status: BookingStatus.PENDING_PAYMENT,
      paymentDueAt: new Date(Date.now() - 60 * 1000),
      payment: { id: "payment_1" },
    });

    await expect(
      submitPaymentProof("member_1", {
        bookingId: "booking_1",
        proofFileUrl: "https://example.com/proof.png",
      }),
    ).rejects.toBeInstanceOf(PaymentValidationError);
    expect(mockPrisma.payment.update).not.toHaveBeenCalled();
  });

  it("approves pending payment and confirms booking", async () => {
    mockPrisma.booking.findUnique.mockResolvedValueOnce({
      id: "booking_1",
      payment: { status: PaymentStatus.PENDING_REVIEW },
    });

    await reviewPayment("staff_1", {
      bookingId: "booking_1",
      approved: true,
    });

    expect(mockPrisma.payment.update).toHaveBeenCalledWith({
      where: { bookingId: "booking_1" },
      data: {
        status: PaymentStatus.APPROVED,
        reviewedById: "staff_1",
        reviewedAt: expect.any(Date),
        rejectionReason: null,
      },
    });
    expect(mockPrisma.booking.update).toHaveBeenCalledWith({
      where: { id: "booking_1" },
      data: { status: BookingStatus.CONFIRMED },
      include: { payment: true },
    });
  });

  it("rejects payment review when payment is not pending review", async () => {
    mockPrisma.booking.findUnique.mockResolvedValueOnce({
      id: "booking_1",
      payment: { status: PaymentStatus.WAITING_UPLOAD },
    });

    await expect(
      reviewPayment("staff_1", {
        bookingId: "booking_1",
        approved: true,
      }),
    ).rejects.toBeInstanceOf(PaymentValidationError);
    expect(mockPrisma.payment.update).not.toHaveBeenCalled();
  });

  it("rejects pending payment and rejects booking", async () => {
    mockPrisma.booking.findUnique.mockResolvedValueOnce({
      id: "booking_1",
      payment: { status: PaymentStatus.PENDING_REVIEW },
    });

    await reviewPayment("staff_1", {
      bookingId: "booking_1",
      approved: false,
      rejectionReason: "Proof is unreadable.",
    });

    expect(mockPrisma.payment.update).toHaveBeenCalledWith({
      where: { bookingId: "booking_1" },
      data: {
        status: PaymentStatus.REJECTED,
        reviewedById: "staff_1",
        reviewedAt: expect.any(Date),
        rejectionReason: "Proof is unreadable.",
      },
    });
    expect(mockPrisma.booking.update).toHaveBeenCalledWith({
      where: { id: "booking_1" },
      data: { status: BookingStatus.REJECTED },
      include: { payment: true },
    });
  });
});
