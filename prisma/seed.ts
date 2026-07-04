import { BookingStatus, PaymentStatus, PrismaClient, Role, RoomStatus } from "@prisma/client";

import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

const demoPassword = "Password123!";
const demoBookingPrefix = "[demo]";
const paymentWindowMinutes = 30;

function assertSafeSeedEnvironment() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "true") {
    throw new Error("Refusing to run demo seed in production without ALLOW_DEMO_SEED=true.");
  }
}

async function upsertUser(input: {
  email: string;
  fullName: string;
  role: Role;
  phone?: string;
}) {
  const user = await prisma.user.upsert({
    where: { email: input.email },
    update: {
      name: input.fullName,
      passwordHash: hashPassword(demoPassword),
    },
    create: {
      email: input.email,
      name: input.fullName,
      passwordHash: hashPassword(demoPassword),
    },
  });

  const profile = await prisma.profile.upsert({
    where: { userId: user.id },
    update: {
      fullName: input.fullName,
      phone: input.phone,
      role: input.role,
    },
    create: {
      userId: user.id,
      fullName: input.fullName,
      phone: input.phone,
      role: input.role,
    },
  });

  return { user, profile };
}

function atDaysFromNow(days: number, hour: number, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);

  return date;
}

async function resetDemoBookings() {
  const demoBookings = await prisma.booking.findMany({
    where: {
      purpose: {
        startsWith: demoBookingPrefix,
      },
    },
    select: { id: true },
  });

  const bookingIds = demoBookings.map((booking) => booking.id);

  if (bookingIds.length === 0) {
    return;
  }

  await prisma.checkin.deleteMany({
    where: { bookingId: { in: bookingIds } },
  });

  await prisma.payment.deleteMany({
    where: { bookingId: { in: bookingIds } },
  });

  await prisma.booking.deleteMany({
    where: { id: { in: bookingIds } },
  });
}

async function createDemoBooking(input: {
  roomId: string;
  memberId: string;
  staffProfileId?: string;
  startAt: Date;
  durationHours: number;
  attendeeCount: number;
  hourlyRate: number;
  bookingStatus: BookingStatus;
  paymentStatus: PaymentStatus;
  purpose: string;
  proofFileUrl?: string;
  rejectionReason?: string;
  includeCheckin?: boolean;
}) {
  const endAt = new Date(input.startAt.getTime() + input.durationHours * 60 * 60 * 1000);
  const totalPrice = input.hourlyRate * input.durationHours;
  const reviewedStatuses: PaymentStatus[] = [PaymentStatus.APPROVED, PaymentStatus.REJECTED];
  const isReviewed = reviewedStatuses.includes(input.paymentStatus);

  const booking = await prisma.booking.create({
    data: {
      roomId: input.roomId,
      memberId: input.memberId,
      startAt: input.startAt,
      endAt,
      attendeeCount: input.attendeeCount,
      totalPrice,
      status: input.bookingStatus,
      purpose: `${demoBookingPrefix} ${input.purpose}`,
      paymentDueAt: new Date(Date.now() + paymentWindowMinutes * 60 * 1000),
      payment: {
        create: {
          amount: totalPrice,
          proofFileUrl: input.proofFileUrl,
          status: input.paymentStatus,
          reviewedById: isReviewed ? input.staffProfileId : undefined,
          reviewedAt: isReviewed ? new Date() : undefined,
          rejectionReason: input.paymentStatus === PaymentStatus.REJECTED ? input.rejectionReason : undefined,
        },
      },
    },
  });

  if (input.includeCheckin && input.staffProfileId) {
    await prisma.checkin.create({
      data: {
        bookingId: booking.id,
        checkedInById: input.staffProfileId,
        note: "Seed check-in record.",
      },
    });
  }

  return booking;
}

async function main() {
  assertSafeSeedEnvironment();

  const superAdmin = await upsertUser({
    email: "superadmin@example.com",
    fullName: "Super Admin",
    role: Role.SUPER_ADMIN,
  });

  const staff = await upsertUser({
    email: "staff@example.com",
    fullName: "Workspace Staff",
    role: Role.STAFF,
  });

  const member = await upsertUser({
    email: "member@example.com",
    fullName: "Demo Member",
    role: Role.MEMBER,
    phone: "0800000000",
  });

  const branch = await prisma.branch.upsert({
    where: { name: "KMITL Lifelong Learning Center" },
    update: {},
    create: {
      name: "KMITL Lifelong Learning Center",
      address: "King Mongkut's Institute of Technology Ladkrabang",
      openingTime: new Date("1970-01-01T08:00:00.000Z"),
      closingTime: new Date("1970-01-01T20:00:00.000Z"),
    },
  });

  const amenities = await Promise.all(
    [
      ["Projector", "presentation"],
      ["Whiteboard", "pen-tool"],
      ["Wi-Fi", "wifi"],
      ["Video Conference", "video"],
      ["Power Outlet", "plug"],
      ["Air Conditioning", "snowflake"],
    ].map(([name, icon]) =>
      prisma.amenity.upsert({
        where: { name },
        update: { icon },
        create: { name, icon },
      }),
    ),
  );

  const rooms = await Promise.all(
    [
      {
        name: "Focus Room A",
        description: "Small private room for focused discussion.",
        capacity: 4,
        hourlyRate: 250,
        amenityNames: ["Wi-Fi", "Whiteboard", "Power Outlet", "Air Conditioning"],
      },
      {
        name: "Meeting Room B",
        description: "Standard meeting room for team collaboration.",
        capacity: 8,
        hourlyRate: 450,
        amenityNames: ["Projector", "Whiteboard", "Wi-Fi", "Video Conference", "Air Conditioning"],
      },
      {
        name: "Workshop Room C",
        description: "Large room for workshop and training sessions.",
        capacity: 20,
        hourlyRate: 900,
        amenityNames: ["Projector", "Whiteboard", "Wi-Fi", "Power Outlet", "Air Conditioning"],
      },
    ].map(async (room) => {
      const createdRoom = await prisma.room.upsert({
        where: {
          branchId_name: {
            branchId: branch.id,
            name: room.name,
          },
        },
        update: {
          description: room.description,
          capacity: room.capacity,
          hourlyRate: room.hourlyRate,
          status: RoomStatus.ACTIVE,
        },
        create: {
          branchId: branch.id,
          name: room.name,
          description: room.description,
          capacity: room.capacity,
          hourlyRate: room.hourlyRate,
          status: RoomStatus.ACTIVE,
        },
      });

      const roomAmenities = amenities.filter((amenity) => room.amenityNames.includes(amenity.name));

      await prisma.roomAmenity.createMany({
        data: roomAmenities.map((amenity) => ({
          roomId: createdRoom.id,
          amenityId: amenity.id,
        })),
        skipDuplicates: true,
      });

      return createdRoom;
    }),
  );

  await resetDemoBookings();

  await Promise.all([
    createDemoBooking({
      roomId: rooms[0].id,
      memberId: member.profile.id,
      startAt: atDaysFromNow(1, 9),
      durationHours: 1,
      attendeeCount: 3,
      hourlyRate: 250,
      bookingStatus: BookingStatus.PENDING_PAYMENT,
      paymentStatus: PaymentStatus.WAITING_UPLOAD,
      purpose: "Waiting for member payment proof",
    }),
    createDemoBooking({
      roomId: rooms[1].id,
      memberId: member.profile.id,
      startAt: atDaysFromNow(1, 11),
      durationHours: 2,
      attendeeCount: 6,
      hourlyRate: 450,
      bookingStatus: BookingStatus.PENDING_REVIEW,
      paymentStatus: PaymentStatus.PENDING_REVIEW,
      purpose: "Payment proof waiting for staff review",
      proofFileUrl: "https://example.com/payment-proof/pending-review.png",
    }),
    createDemoBooking({
      roomId: rooms[1].id,
      memberId: member.profile.id,
      staffProfileId: staff.profile.id,
      startAt: atDaysFromNow(2, 10),
      durationHours: 2,
      attendeeCount: 6,
      hourlyRate: 450,
      bookingStatus: BookingStatus.CONFIRMED,
      paymentStatus: PaymentStatus.APPROVED,
      purpose: "Confirmed project planning meeting",
      proofFileUrl: "https://example.com/payment-proof/approved.png",
    }),
    createDemoBooking({
      roomId: rooms[2].id,
      memberId: member.profile.id,
      staffProfileId: staff.profile.id,
      startAt: atDaysFromNow(3, 13),
      durationHours: 3,
      attendeeCount: 16,
      hourlyRate: 900,
      bookingStatus: BookingStatus.REJECTED,
      paymentStatus: PaymentStatus.REJECTED,
      purpose: "Rejected payment proof sample",
      proofFileUrl: "https://example.com/payment-proof/rejected.png",
      rejectionReason: "Uploaded payment proof is unreadable.",
    }),
    createDemoBooking({
      roomId: rooms[0].id,
      memberId: member.profile.id,
      staffProfileId: staff.profile.id,
      startAt: atDaysFromNow(-1, 14),
      durationHours: 1,
      attendeeCount: 4,
      hourlyRate: 250,
      bookingStatus: BookingStatus.COMPLETED,
      paymentStatus: PaymentStatus.APPROVED,
      purpose: "Completed focus room session",
      proofFileUrl: "https://example.com/payment-proof/completed.png",
      includeCheckin: true,
    }),
  ]);

  console.log({
    superAdmin: superAdmin.user.email,
    staff: staff.user.email,
    member: member.user.email,
    demoPassword,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
