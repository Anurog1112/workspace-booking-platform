import { BookingStatus, PaymentStatus, Prisma, Role, RoomStatus } from "@prisma/client";

import { BRANCH_TIME_ZONE, combineBranchDateTime } from "@/lib/branch-time";
import { demoBookings, demoRooms, demoUsers, isDemoMode } from "@/lib/demo-mode";
import { prisma } from "@/lib/prisma";

function getTodayRange() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BRANCH_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  const date = `${value("year")}-${value("month")}-${value("day")}`;
  const start = combineBranchDateTime(date, "00:00");
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return { start, end };
}

export async function getMemberDashboard(profileId: string) {
  const now = new Date();

  if (isDemoMode) {
    const upcoming = demoBookings.filter((booking) => booking.memberId === profileId && booking.endAt >= now);

    return {
      activeRooms: demoRooms.filter((room) => room.status === RoomStatus.ACTIVE).length,
      upcomingBookings: upcoming.filter((booking) => booking.status === BookingStatus.CONFIRMED).length,
      paymentActions: upcoming.filter((booking) => booking.status === BookingStatus.PENDING_PAYMENT).length,
      nextBooking: upcoming.sort((a, b) => a.startAt.getTime() - b.startAt.getTime())[0] ?? null,
    };
  }

  const [metrics, nextBooking] = await Promise.all([
    prisma.$queryRaw<Array<{ activeRooms: bigint; upcomingBookings: bigint; paymentActions: bigint }>>(Prisma.sql`
      SELECT
        (SELECT COUNT(*) FROM "Room" WHERE status = 'ACTIVE') AS "activeRooms",
        COUNT(*) FILTER (WHERE status IN ('CONFIRMED', 'PENDING_REVIEW')) AS "upcomingBookings",
        COUNT(*) FILTER (WHERE status IN ('PENDING_PAYMENT', 'REJECTED')) AS "paymentActions"
      FROM "Booking"
      WHERE "memberId" = ${profileId} AND "endAt" >= ${now}
    `),
    prisma.booking.findFirst({
      where: {
        memberId: profileId,
        endAt: { gte: now },
        status: { notIn: [BookingStatus.CANCELLED, BookingStatus.REJECTED, BookingStatus.EXPIRED] },
      },
      select: { id: true, startAt: true, status: true, room: { select: { name: true } } },
      orderBy: { startAt: "asc" },
    }),
  ]);
  const row = metrics[0];

  return {
    activeRooms: Number(row.activeRooms),
    upcomingBookings: Number(row.upcomingBookings),
    paymentActions: Number(row.paymentActions),
    nextBooking,
  };
}

export async function getStaffDashboard() {
  const { start, end } = getTodayRange();

  if (isDemoMode) {
    return {
      pendingReviews: demoBookings.filter((booking) => booking.payment?.status === PaymentStatus.PENDING_REVIEW).length,
      confirmedToday: demoBookings.filter(
        (booking) => booking.status === BookingStatus.CONFIRMED && booking.startAt >= start && booking.startAt < end,
      ).length,
      checkinsToday: 0,
      nextArrivals: demoBookings.filter((booking) => booking.status === BookingStatus.CONFIRMED).slice(0, 5),
    };
  }

  const [metrics, nextArrivals] = await Promise.all([
    prisma.$queryRaw<Array<{ pendingReviews: bigint; confirmedToday: bigint; checkinsToday: bigint }>>(Prisma.sql`
      SELECT
        (SELECT COUNT(*) FROM "Payment" WHERE status = 'PENDING_REVIEW') AS "pendingReviews",
        (SELECT COUNT(*) FROM "Booking" WHERE status = 'CONFIRMED' AND "startAt" >= ${start} AND "startAt" < ${end}) AS "confirmedToday",
        (SELECT COUNT(*) FROM "Checkin" WHERE "checkedInAt" >= ${start} AND "checkedInAt" < ${end}) AS "checkinsToday"
    `),
    prisma.booking.findMany({
      where: { status: BookingStatus.CONFIRMED, startAt: { gte: new Date() } },
      select: {
        id: true,
        startAt: true,
        attendeeCount: true,
        room: { select: { name: true } },
        member: { select: { fullName: true } },
      },
      orderBy: { startAt: "asc" },
      take: 5,
    }),
  ]);
  const row = metrics[0];

  return {
    pendingReviews: Number(row.pendingReviews),
    confirmedToday: Number(row.confirmedToday),
    checkinsToday: Number(row.checkinsToday),
    nextArrivals,
  };
}

export async function getAdminDashboard() {
  if (isDemoMode) {
    return {
      activeRooms: demoRooms.filter((room) => room.status === RoomStatus.ACTIVE).length,
      unavailableRooms: demoRooms.filter((room) => room.status !== RoomStatus.ACTIVE).length,
      users: demoUsers.length,
      totalBookings: demoBookings.length,
      pendingReviews: demoBookings.filter((booking) => booking.payment?.status === PaymentStatus.PENDING_REVIEW).length,
      confirmedBookings: demoBookings.filter((booking) => booking.status === BookingStatus.CONFIRMED).length,
    };
  }

  const rows = await prisma.$queryRaw<Array<{
    activeRooms: bigint;
    unavailableRooms: bigint;
    users: bigint;
    totalBookings: bigint;
    pendingReviews: bigint;
    confirmedBookings: bigint;
  }>>(Prisma.sql`
    SELECT
      (SELECT COUNT(*) FROM "Room" WHERE status = 'ACTIVE') AS "activeRooms",
      (SELECT COUNT(*) FROM "Room" WHERE status IN ('MAINTENANCE', 'INACTIVE')) AS "unavailableRooms",
      (SELECT COUNT(*) FROM "Profile") AS users,
      (SELECT COUNT(*) FROM "Booking") AS "totalBookings",
      (SELECT COUNT(*) FROM "Payment" WHERE status = 'PENDING_REVIEW') AS "pendingReviews",
      (SELECT COUNT(*) FROM "Booking" WHERE status = 'CONFIRMED') AS "confirmedBookings"
  `);
  const row = rows[0];

  return {
    activeRooms: Number(row.activeRooms),
    unavailableRooms: Number(row.unavailableRooms),
    users: Number(row.users),
    totalBookings: Number(row.totalBookings),
    pendingReviews: Number(row.pendingReviews),
    confirmedBookings: Number(row.confirmedBookings),
  };
}

export function getDashboardHome(role: Role) {
  if (role === Role.SUPER_ADMIN) {
    return "/admin";
  }

  if (role === Role.STAFF) {
    return "/staff";
  }

  return "/member";
}
