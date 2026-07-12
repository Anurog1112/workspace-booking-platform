import { PrismaClient, Role, RoomStatus } from "@prisma/client";

import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

const seedPassword = process.env.SEED_DEFAULT_PASSWORD ?? "Workspace@12345";

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
      passwordHash: hashPassword(seedPassword),
    },
    create: {
      email: input.email,
      name: input.fullName,
      passwordHash: hashPassword(seedPassword),
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

async function removeLegacyDemoBookings() {
  const bookings = await prisma.booking.findMany({
    where: {
      purpose: {
        startsWith: "[demo]",
      },
    },
    select: { id: true },
  });

  const bookingIds = bookings.map((booking) => booking.id);

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

async function main() {
  await removeLegacyDemoBookings();

  const superAdmin = await upsertUser({
    email: process.env.SEED_SUPER_ADMIN_EMAIL ?? "admin@workspace.local",
    fullName: "Workspace Admin",
    role: Role.SUPER_ADMIN,
  });

  const staff = await upsertUser({
    email: process.env.SEED_STAFF_EMAIL ?? "staff@workspace.local",
    fullName: "Workspace Staff",
    role: Role.STAFF,
  });

  const branch = await prisma.branch.upsert({
    where: { name: "KMITL Lifelong Learning Center" },
    update: {
      address: "King Mongkut's Institute of Technology Ladkrabang",
      openingTime: new Date("1970-01-01T08:00:00.000Z"),
      closingTime: new Date("1970-01-01T20:00:00.000Z"),
    },
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

  await Promise.all(
    [
      {
        name: "Focus Room A",
        description: "Small private room for focused discussion.",
        capacity: 4,
        hourlyRate: 250,
        imageUrl: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
        amenityNames: ["Wi-Fi", "Whiteboard", "Power Outlet", "Air Conditioning"],
      },
      {
        name: "Meeting Room B",
        description: "Standard meeting room for team collaboration.",
        capacity: 8,
        hourlyRate: 450,
        imageUrl: "https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=1200&q=80",
        amenityNames: ["Projector", "Whiteboard", "Wi-Fi", "Video Conference", "Air Conditioning"],
      },
      {
        name: "Workshop Room C",
        description: "Large room for workshop and training sessions.",
        capacity: 20,
        hourlyRate: 900,
        imageUrl: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80",
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
          imageUrl: room.imageUrl,
          status: RoomStatus.ACTIVE,
        },
        create: {
          branchId: branch.id,
          name: room.name,
          description: room.description,
          capacity: room.capacity,
          hourlyRate: room.hourlyRate,
          imageUrl: room.imageUrl,
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

  console.log({
    superAdmin: superAdmin.user.email,
    staff: staff.user.email,
    seededRooms: 3,
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
