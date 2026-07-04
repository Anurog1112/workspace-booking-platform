import { BookingStatus, PaymentStatus, Prisma, PrismaClient, RoomStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { CreateBookingInput } from "@/server/validators/booking";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

const MS_PER_HOUR = 1000 * 60 * 60;
const PAYMENT_WINDOW_MINUTES = 30;
const PAYMENT_WINDOW_MS = PAYMENT_WINDOW_MINUTES * 60 * 1000;

export const BLOCKING_BOOKING_STATUSES = [
  BookingStatus.PENDING_PAYMENT,
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

  if (!isSameUtcDate(input.startAt, input.endAt)) {
    throw new BookingValidationError("Booking must start and end on the same day.");
  }

  if (input.startAt.getTime() <= now.getTime() + PAYMENT_WINDOW_MS) {
    throw new BookingValidationError("Booking start time must be after the payment window.");
  }
}

function getUtcMinutesSinceMidnight(date: Date) {
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

function isSameUtcDate(startAt: Date, endAt: Date) {
  return (
    startAt.getUTCFullYear() === endAt.getUTCFullYear() &&
    startAt.getUTCMonth() === endAt.getUTCMonth() &&
    startAt.getUTCDate() === endAt.getUTCDate()
  );
}

function assertBookingWithinBranchHours(input: { startAt: Date; endAt: Date }, branch: { openingTime: Date; closingTime: Date }) {
  const bookingStart = getUtcMinutesSinceMidnight(input.startAt);
  const bookingEnd = getUtcMinutesSinceMidnight(input.endAt);
  const opening = getUtcMinutesSinceMidnight(branch.openingTime);
  const closing = getUtcMinutesSinceMidnight(branch.closingTime);

  if (bookingStart < opening || bookingEnd > closing) {
    throw new BookingValidationError("Booking time must be within branch opening hours.");
  }
}

export async function hasBookingOverlap(
  input: { roomId: string; startAt: Date; endAt: Date; excludeBookingId?: string },
  client: PrismaExecutor = prisma,
) {
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

export async function listBookingsForMember(memberId: string) {
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
  });
}

export async function listAllBookings() {
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

export async function cancelOwnPendingBooking(memberId: string, bookingId: string) {
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
