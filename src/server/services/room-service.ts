import { RoomStatus, type Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { BLOCKING_BOOKING_STATUSES } from "@/server/services/booking-service";
import type { CreateRoomInput, RoomSearchInput, UpdateRoomInput } from "@/server/validators/room";

export async function listBranches() {
  return prisma.branch.findMany({
    orderBy: { name: "asc" },
  });
}

export async function listAmenities() {
  return prisma.amenity.findMany({
    orderBy: { name: "asc" },
  });
}

export async function createAmenity(input: { name: string; icon?: string }) {
  return prisma.amenity.create({
    data: {
      name: input.name,
      icon: input.icon,
    },
  });
}

export async function listRooms(filters: RoomSearchInput = {}) {
  const where: Prisma.RoomWhereInput = {
    branchId: filters.branchId,
    status: filters.status ?? RoomStatus.ACTIVE,
    capacity: filters.capacity ? { gte: filters.capacity } : undefined,
    bookings:
      filters.startAt && filters.endAt
        ? {
            none: {
              startAt: { lt: filters.endAt },
              endAt: { gt: filters.startAt },
              status: { in: BLOCKING_BOOKING_STATUSES },
            },
          }
        : undefined,
  };

  return prisma.room.findMany({
    where,
    include: {
      branch: true,
      amenities: {
        include: {
          amenity: true,
        },
      },
    },
    orderBy: [{ branch: { name: "asc" } }, { name: "asc" }],
  });
}

export async function listRoomsForAdmin() {
  return prisma.room.findMany({
    include: {
      branch: true,
      amenities: {
        include: {
          amenity: true,
        },
      },
    },
    orderBy: [{ branch: { name: "asc" } }, { name: "asc" }],
  });
}

export async function getRoomById(roomId: string) {
  return prisma.room.findUnique({
    where: { id: roomId },
    include: {
      branch: true,
      amenities: {
        include: {
          amenity: true,
        },
      },
    },
  });
}

export async function createRoom(input: CreateRoomInput) {
  const amenityIds = [...new Set(input.amenityIds)];

  return prisma.room.create({
    data: {
      branchId: input.branchId,
      name: input.name,
      description: input.description,
      capacity: input.capacity,
      hourlyRate: input.hourlyRate,
      imageUrl: input.imageUrl,
      status: input.status,
      amenities: {
        create: amenityIds.map((amenityId) => ({
          amenityId,
        })),
      },
    },
    include: {
      amenities: true,
    },
  });
}

export async function updateRoom(input: UpdateRoomInput) {
  const { id, amenityIds, ...roomData } = input;
  const uniqueAmenityIds = amenityIds ? [...new Set(amenityIds)] : undefined;

  return prisma.$transaction(async (tx) => {
    const room = await tx.room.update({
      where: { id },
      data: roomData,
    });

    if (uniqueAmenityIds) {
      await tx.roomAmenity.deleteMany({
        where: { roomId: id },
      });

      await tx.roomAmenity.createMany({
        data: uniqueAmenityIds.map((amenityId) => ({
          roomId: id,
          amenityId,
        })),
        skipDuplicates: true,
      });
    }

    return room;
  });
}
