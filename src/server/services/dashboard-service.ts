import { BookingStatus, PaymentStatus, Role, RoomStatus } from "@prisma/client";

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

  const [activeRooms, statusCounts, nextBooking] = await Promise.all([
    prisma.room.count({ where: { status: RoomStatus.ACTIVE } }),
    prisma.booking.groupBy({
      by: ["status"],
      where: { memberId: profileId, endAt: { gte: now } },
      _count: { _all: true },
    }),
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
  const count = (statuses: BookingStatus[]) =>
    statusCounts.filter((item) => statuses.includes(item.status)).reduce((total, item) => total + item._count._all, 0);

  return {
    activeRooms,
    upcomingBookings: count([BookingStatus.CONFIRMED, BookingStatus.PENDING_REVIEW]),
    paymentActions: count([BookingStatus.PENDING_PAYMENT, BookingStatus.REJECTED]),
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

  const [pendingReviews, confirmedToday, checkinsToday, nextArrivals] = await Promise.all([
    prisma.payment.count({ where: { status: PaymentStatus.PENDING_REVIEW } }),
    prisma.booking.count({ where: { status: BookingStatus.CONFIRMED, startAt: { gte: start, lt: end } } }),
    prisma.checkin.count({ where: { checkedInAt: { gte: start, lt: end } } }),
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

  return { pendingReviews, confirmedToday, checkinsToday, nextArrivals };
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

  const [roomCounts, users, bookingCounts, pendingReviews] = await Promise.all([
    prisma.room.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.profile.count(),
    prisma.booking.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.payment.count({ where: { status: PaymentStatus.PENDING_REVIEW } }),
  ]);
  const roomCount = (statuses: RoomStatus[]) =>
    roomCounts.filter((item) => statuses.includes(item.status)).reduce((total, item) => total + item._count._all, 0);
  const bookingCount = (statuses: BookingStatus[]) =>
    bookingCounts.filter((item) => statuses.includes(item.status)).reduce((total, item) => total + item._count._all, 0);

  return {
    activeRooms: roomCount([RoomStatus.ACTIVE]),
    unavailableRooms: roomCount([RoomStatus.MAINTENANCE, RoomStatus.INACTIVE]),
    users,
    totalBookings: bookingCounts.reduce((total, item) => total + item._count._all, 0),
    pendingReviews,
    confirmedBookings: bookingCount([BookingStatus.CONFIRMED]),
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
