import { BookingStatus, PaymentStatus, Prisma, PrismaClient, RoomStatus, type Role } from "@prisma/client";

import { getBranchDateTimeMinutes, getBranchTimeMinutes, isSameBranchDate } from "@/lib/branch-time";
import { createDemoBooking, demoBookings, getDemoBookingsForMember, isDemoMode } from "@/lib/demo-mode";
import { prisma } from "@/lib/prisma";
import type { CreateBookingInput } from "@/server/validators/booking";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

const MS_PER_HOUR = 1000 * 60 * 60;
const PAYMENT_WINDOW_MINUTES = 30;
const PAYMENT_WINDOW_MS = PAYMENT_WINDOW_MINUTES * 60 * 1000;

export const BLOCKING_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.PENDING_REVIEW,
  BookingStatus.CONFIRMED,
];

export class BookingConflictError extends Error {
  constructor() {
    super("Room is not available for the selected time range.");
    this.name = "BookingConflictError";
  }
}

export class BookingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BookingValidationError";
  }
}

function assertValidBookingTimeRange(input: { startAt: Date; endAt: Date }) {
  const now = new Date();

  if (input.startAt <= new Date()) {
    throw new BookingValidationError("Booking start time must be in the future.");
  }

  if (input.endAt <= input.startAt) {
    throw new BookingValidationError("Booking end time must be after start time.");
  }

  if (!isSameBranchDate(input.startAt, input.endAt)) {
    throw new BookingValidationError("Booking must start and end on the same day.");
  }

  if (input.startAt.getTime() <= now.getTime() + PAYMENT_WINDOW_MS) {
    throw new BookingValidationError("Booking start time must be after the payment window.");
  }
}

function assertBookingWithinBranchHours(input: { startAt: Date; endAt: Date }, branch: { openingTime: Date; closingTime: Date }) {
  const bookingStart = getBranchDateTimeMinutes(input.startAt);
  const bookingEnd = getBranchDateTimeMinutes(input.endAt);
  const opening = getBranchTimeMinutes(branch.openingTime);
  const closing = getBranchTimeMinutes(branch.closingTime);

  if (bookingStart < opening || bookingEnd > closing) {
    throw new BookingValidationError("Booking time must be within branch opening hours.");
  }
}

export async function hasBookingOverlap(
  input: { roomId: string; startAt: Date; endAt: Date; excludeBookingId?: string },
  client: PrismaExecutor = prisma,
) {
  if (isDemoMode) {
    return demoBookings.some(
      (booking) =>
        booking.id !== input.excludeBookingId &&
        booking.roomId === input.roomId &&
        booking.startAt < input.endAt &&
        booking.endAt > input.startAt &&
        BLOCKING_BOOKING_STATUSES.includes(booking.status),
    );
  }

  const overlap = await client.booking.findFirst({
    where: {
      id: input.excludeBookingId ? { not: input.excludeBookingId } : undefined,
      roomId: input.roomId,
      startAt: { lt: input.endAt },
      endAt: { gt: input.startAt },
      status: { in: BLOCKING_BOOKING_STATUSES },
    },
    select: { id: true },
  });

  return Boolean(overlap);
}

export async function assertRoomAvailable(
  input: { roomId: string; startAt: Date; endAt: Date; excludeBookingId?: string },
  client: PrismaExecutor = prisma,
) {
  const hasOverlap = await hasBookingOverlap(input, client);

  if (hasOverlap) {
    throw new BookingConflictError();
  }
}

export async function createBooking(memberId: string, input: CreateBookingInput) {
  assertValidBookingTimeRange(input);

  if (isDemoMode) {
    await assertRoomAvailable(input);
    return createDemoBooking(memberId, input);
  }

  return prisma.$transaction(async (tx) => {
    const room = await tx.room.findUnique({
      where: { id: input.roomId },
      include: { branch: true },
    });

    if (!room || room.status !== RoomStatus.ACTIVE) {
      throw new BookingValidationError("Room is not available for booking.");
    }

    if (input.attendeeCount > room.capacity) {
      throw new BookingValidationError("Attendee count exceeds room capacity.");
    }

    assertBookingWithinBranchHours(input, room.branch);

    await assertRoomAvailable(input, tx);

    const durationHours = Math.ceil((input.endAt.getTime() - input.startAt.getTime()) / MS_PER_HOUR);
    const totalPrice = new Prisma.Decimal(durationHours).mul(room.hourlyRate);
    const paymentDueAt = new Date(Date.now() + PAYMENT_WINDOW_MS);

    return tx.booking.create({
      data: {
        roomId: input.roomId,
        memberId,
        startAt: input.startAt,
        endAt: input.endAt,
        attendeeCount: input.attendeeCount,
        purpose: input.purpose,
        totalPrice,
        paymentDueAt,
        payment: {
          create: {
            amount: totalPrice,
          },
        },
      },
      include: {
        room: true,
        payment: true,
      },
    });
  });
}

export async function listBookingsForMember(memberId: string, take?: number) {
  if (isDemoMode) {
    return getDemoBookingsForMember(memberId);
  }

  return prisma.booking.findMany({
    where: { memberId },
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
    ...(take ? { take } : {}),
  });
}

export async function getBookingForProfile(input: { bookingId: string; profileId: string; role: Role }) {
  if (isDemoMode) {
    return demoBookings.find((booking) => booking.id === input.bookingId && (booking.memberId === input.profileId || input.role !== "MEMBER")) ?? null;
  }

  return prisma.booking.findFirst({
    where: {
      id: input.bookingId,
      memberId: input.role === "MEMBER" ? input.profileId : undefined,
    },
    include: {
      member: true,
      room: {
        include: {
          branch: true,
          amenities: {
            include: {
              amenity: true,
            },
          },
        },
      },
      payment: true,
      checkin: true,
    },
  });
}

export async function listUpcomingBookingsForRoom(roomId: string) {
  if (isDemoMode) {
    return demoBookings
      .filter((booking) => booking.roomId === roomId && BLOCKING_BOOKING_STATUSES.includes(booking.status))
      .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  }

  return prisma.booking.findMany({
    where: {
      roomId,
      status: { in: BLOCKING_BOOKING_STATUSES },
      endAt: { gte: new Date() },
    },
    include: {
      payment: true,
    },
    orderBy: { startAt: "asc" },
    take: 8,
  });
}

export async function listAllBookings() {
  if (isDemoMode) {
    return demoBookings;
  }

  return prisma.booking.findMany({
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
}

export async function listPendingReviewBookings(take = 25) {
  if (isDemoMode) {
    return demoBookings.filter((booking) => booking.payment?.status === PaymentStatus.PENDING_REVIEW).slice(0, take);
  }

  return prisma.booking.findMany({
    where: { payment: { is: { status: PaymentStatus.PENDING_REVIEW } } },
    include: {
      member: true,
      room: { include: { branch: true } },
      payment: true,
      checkin: true,
    },
    orderBy: { updatedAt: "asc" },
    take,
  });
}

export async function listRecentBookings(take = 8) {
  if (isDemoMode) {
    return demoBookings.slice(0, take);
  }

  return prisma.booking.findMany({
    include: {
      member: true,
      room: { include: { branch: true } },
      payment: true,
      checkin: true,
    },
    orderBy: { updatedAt: "desc" },
    take,
  });
}

export async function cancelOwnPendingBooking(memberId: string, bookingId: string) {
  if (isDemoMode) {
    const booking = getDemoBookingsForMember(memberId).find((item) => item.id === bookingId);

    if (!booking) {
      throw new BookingValidationError("Booking cannot be cancelled.");
    }

    return {
      ...booking,
      status: BookingStatus.CANCELLED,
      payment: booking.payment ? { ...booking.payment, status: PaymentStatus.CANCELLED } : null,
    };
  }

  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findFirst({
      where: {
        id: bookingId,
        memberId,
        status: { in: [BookingStatus.PENDING_PAYMENT, BookingStatus.PENDING_REVIEW] },
      },
      include: { payment: true },
    });

    if (!booking) {
      throw new BookingValidationError("Booking cannot be cancelled.");
    }

    if (booking.payment) {
      await tx.payment.update({
        where: { bookingId },
        data: {
          status: PaymentStatus.CANCELLED,
          rejectionReason: null,
        },
      });
    }

    return tx.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CANCELLED },
      include: { payment: true },
    });
  });
}
