import { describe, expect, it } from "vitest";

import { signInSchema } from "@/server/validators/auth";
import { createBookingSchema } from "@/server/validators/booking";
import { reviewPaymentSchema } from "@/server/validators/payment";
import { roomSearchSchema } from "@/server/validators/room";

describe("validators", () => {
  function daysFromNow(days: number, hour: number) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    date.setHours(hour, 0, 0, 0);

    return date.toISOString();
  }

  it("rejects booking with invalid time range", () => {
    const result = createBookingSchema.safeParse({
      roomId: "room_1",
      startAt: daysFromNow(1, 11),
      endAt: daysFromNow(1, 9),
      attendeeCount: 2,
    });

    expect(result.success).toBe(false);
  });

  it("rejects booking in the past", () => {
    const startAt = new Date(Date.now() - 60 * 60 * 1000);
    const endAt = new Date(Date.now() + 60 * 60 * 1000);

    const result = createBookingSchema.safeParse({
      roomId: "room_1",
      startAt,
      endAt,
      attendeeCount: 2,
    });

    expect(result.success).toBe(false);
  });

  it("requires room search start and end time together", () => {
    const result = roomSearchSchema.safeParse({
      startAt: "2026-07-10T09:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });

  it("requires rejection reason when rejecting payment", () => {
    const result = reviewPaymentSchema.safeParse({
      bookingId: "booking_1",
      approved: false,
    });

    expect(result.success).toBe(false);
  });

  it("rejects blank rejection reason when rejecting payment", () => {
    const result = reviewPaymentSchema.safeParse({
      bookingId: "booking_1",
      approved: false,
      rejectionReason: "   ",
    });

    expect(result.success).toBe(false);
  });

  it("normalizes sign in email", () => {
    const result = signInSchema.parse({
      email: "MEMBER@EXAMPLE.COM",
      password: "Password123!",
    });

    expect(result.email).toBe("member@example.com");
  });
});
