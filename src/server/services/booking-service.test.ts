import { BookingStatus, PaymentStatus, Prisma, RoomStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    room: {
      findUnique: vi.fn(),
    },
    booking: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
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
  BookingConflictError,
  BookingValidationError,
  assertRoomAvailable,
  cancelOwnPendingBooking,
  createBooking,
  hasBookingOverlap,
  listAllBookings,
  listBookingsForMember,
} from "@/server/services/booking-service";

describe("booking-service", () => {
  function futureUtcDate(daysFromNow: number, hour: number) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + daysFromNow);
    date.setUTCHours(hour, 0, 0, 0);

    return date;
  }

  function branchHours(openHour = 8, closeHour = 20) {
    return {
      openingTime: new Date(`1970-01-01T${String(openHour).padStart(2, "0")}:00:00.000Z`),
      closingTime: new Date(`1970-01-01T${String(closeHour).padStart(2, "0")}:00:00.000Z`),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(async (callback) => callback(mockPrisma));
  });

  it("detects blocking booking overlap", async () => {
    const startAt = new Date("2026-07-10T09:00:00.000Z");
    const endAt = new Date("2026-07-10T10:00:00.000Z");

    mockPrisma.booking.findFirst.mockResolvedValueOnce({ id: "booking_1" });

    await expect(hasBookingOverlap({ roomId: "room_1", startAt, endAt })).resolves.toBe(true);
    expect(mockPrisma.booking.findFirst).toHaveBeenCalledWith({
      where: {
        id: undefined,
        roomId: "room_1",
        startAt: { lt: endAt },
        endAt: { gt: startAt },
        status: {
          in: [BookingStatus.PENDING_PAYMENT, BookingStatus.PENDING_REVIEW, BookingStatus.CONFIRMED],
        },
      },
      select: { id: true },
    });
  });

  it("rejects room availability when an overlap exists", async () => {
    mockPrisma.booking.findFirst.mockResolvedValueOnce({ id: "booking_1" });

    await expect(
      assertRoomAvailable({
        roomId: "room_1",
        startAt: new Date("2026-07-10T09:00:00.000Z"),
        endAt: new Date("2026-07-10T10:00:00.000Z"),
      }),
    ).rejects.toBeInstanceOf(BookingConflictError);
  });

  it("allows adjacent booking when no blocking record is found", async () => {
    const startAt = futureUtcDate(2, 10);
    const endAt = futureUtcDate(2, 11);

    mockPrisma.booking.findFirst.mockResolvedValueOnce(null);

    await expect(hasBookingOverlap({ roomId: "room_1", startAt, endAt })).resolves.toBe(false);
  });

  it("checks overlap only within the requested room", async () => {
    const startAt = futureUtcDate(2, 10);
    const endAt = futureUtcDate(2, 11);

    mockPrisma.booking.findFirst.mockResolvedValueOnce(null);

    await hasBookingOverlap({ roomId: "room_2", startAt, endAt });

    expect(mockPrisma.booking.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          roomId: "room_2",
        }),
      }),
    );
  });

  it("creates a booking with calculated total price and initial payment", async () => {
    mockPrisma.room.findUnique.mockResolvedValueOnce({
      id: "room_1",
      status: RoomStatus.ACTIVE,
      capacity: 8,
      hourlyRate: new Prisma.Decimal(450),
      branch: branchHours(),
    });
    mockPrisma.booking.findFirst.mockResolvedValueOnce(null);
    mockPrisma.booking.create.mockImplementationOnce(async (args) => args.data);

    await createBooking("member_1", {
      roomId: "room_1",
      startAt: futureUtcDate(2, 9),
      endAt: futureUtcDate(2, 11),
      attendeeCount: 6,
      purpose: "Planning",
    });

    expect(mockPrisma.booking.create).toHaveBeenCalledOnce();
    const createArgs = mockPrisma.booking.create.mock.calls[0][0];
    expect(createArgs.data.totalPrice.toString()).toBe("900");
    expect(createArgs.data.payment.create.amount.toString()).toBe("900");
  });

  it("rejects booking when end time is not after start time", async () => {
    await expect(
      createBooking("member_1", {
        roomId: "room_1",
        startAt: futureUtcDate(2, 11),
        endAt: futureUtcDate(2, 9),
        attendeeCount: 2,
      }),
    ).rejects.toBeInstanceOf(BookingValidationError);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects booking that starts inside the payment window", async () => {
    const startAt = new Date(Date.now() + 10 * 60 * 1000);
    const endAt = new Date(Date.now() + 60 * 60 * 1000);

    await expect(
      createBooking("member_1", {
        roomId: "room_1",
        startAt,
        endAt,
        attendeeCount: 2,
      }),
    ).rejects.toBeInstanceOf(BookingValidationError);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects booking that crosses into another day", async () => {
    await expect(
      createBooking("member_1", {
        roomId: "room_1",
        startAt: futureUtcDate(2, 19),
        endAt: futureUtcDate(3, 9),
        attendeeCount: 2,
      }),
    ).rejects.toBeInstanceOf(BookingValidationError);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects booking when room is inactive", async () => {
    mockPrisma.room.findUnique.mockResolvedValueOnce({
      id: "room_1",
      status: RoomStatus.INACTIVE,
      capacity: 8,
      hourlyRate: new Prisma.Decimal(450),
    });

    await expect(
      createBooking("member_1", {
        roomId: "room_1",
        startAt: futureUtcDate(2, 9),
        endAt: futureUtcDate(2, 10),
        attendeeCount: 2,
      }),
    ).rejects.toBeInstanceOf(BookingValidationError);
  });

  it("rejects booking when attendee count exceeds room capacity", async () => {
    mockPrisma.room.findUnique.mockResolvedValueOnce({
      id: "room_1",
      status: RoomStatus.ACTIVE,
      capacity: 4,
      hourlyRate: new Prisma.Decimal(250),
    });

    await expect(
      createBooking("member_1", {
        roomId: "room_1",
        startAt: futureUtcDate(2, 9),
        endAt: futureUtcDate(2, 10),
        attendeeCount: 5,
      }),
    ).rejects.toBeInstanceOf(BookingValidationError);
  });

  it("rejects booking outside branch opening hours", async () => {
    mockPrisma.room.findUnique.mockResolvedValueOnce({
      id: "room_1",
      status: RoomStatus.ACTIVE,
      capacity: 8,
      hourlyRate: new Prisma.Decimal(450),
      branch: branchHours(),
    });

    await expect(
      createBooking("member_1", {
        roomId: "room_1",
        startAt: futureUtcDate(2, 7),
        endAt: futureUtcDate(2, 9),
        attendeeCount: 2,
      }),
    ).rejects.toBeInstanceOf(BookingValidationError);
    expect(mockPrisma.booking.findFirst).not.toHaveBeenCalled();
  });

  it("cancels pending booking and payment together", async () => {
    mockPrisma.booking.findFirst.mockResolvedValueOnce({
      id: "booking_1",
      memberId: "member_1",
      status: BookingStatus.PENDING_REVIEW,
      payment: { id: "payment_1" },
    });
    mockPrisma.payment.update.mockResolvedValueOnce({});
    mockPrisma.booking.update.mockResolvedValueOnce({
      id: "booking_1",
      status: BookingStatus.CANCELLED,
      payment: { status: PaymentStatus.CANCELLED },
    });

    await cancelOwnPendingBooking("member_1", "booking_1");

    expect(mockPrisma.payment.update).toHaveBeenCalledWith({
      where: { bookingId: "booking_1" },
      data: {
        status: PaymentStatus.CANCELLED,
        rejectionReason: null,
      },
    });
    expect(mockPrisma.booking.update).toHaveBeenCalledWith({
      where: { id: "booking_1" },
      data: { status: BookingStatus.CANCELLED },
      include: { payment: true },
    });
  });

  it("lists bookings for a member only", async () => {
    mockPrisma.booking.findMany.mockResolvedValueOnce([]);

    await listBookingsForMember("member_1");

    expect(mockPrisma.booking.findMany).toHaveBeenCalledWith({
      where: { memberId: "member_1" },
      include: {
        room: {
          include: {
            branch: true,
          },
        },
        payment: true,
        checkin: true,
      },
      orderBy: { startAt: "desc" },
    });
  });

  it("lists all bookings with relations for staff view", async () => {
    mockPrisma.booking.findMany.mockResolvedValueOnce([]);

    await listAllBookings();

    expect(mockPrisma.booking.findMany).toHaveBeenCalledWith({
      include: {
        member: true,
        room: {
          include: {
            branch: true,
          },
        },
        payment: true,
        checkin: true,
      },
      orderBy: { startAt: "desc" },
    });
  });
});
