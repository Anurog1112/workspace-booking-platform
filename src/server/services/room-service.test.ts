import { BookingStatus, RoomStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    room: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    roomAmenity: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { createRoom, getRoomById, listRooms, updateRoom } from "@/server/services/room-service";

describe("room-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(async (callback) => callback(mockPrisma));
  });

  it("filters out rooms with blocking bookings when a time range is provided", async () => {
    const startAt = new Date("2026-07-10T09:00:00.000Z");
    const endAt = new Date("2026-07-10T10:00:00.000Z");

    mockPrisma.room.findMany.mockResolvedValueOnce([]);

    await listRooms({
      branchId: "branch_1",
      capacity: 4,
      status: RoomStatus.ACTIVE,
      startAt,
      endAt,
    });

    expect(mockPrisma.room.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          branchId: "branch_1",
          capacity: { gte: 4 },
          status: RoomStatus.ACTIVE,
          bookings: {
            none: {
              startAt: { lt: endAt },
              endAt: { gt: startAt },
              status: {
                in: [BookingStatus.PENDING_PAYMENT, BookingStatus.PENDING_REVIEW, BookingStatus.CONFIRMED],
              },
            },
          },
        }),
      }),
    );
  });

  it("defaults room list to active rooms", async () => {
    mockPrisma.room.findMany.mockResolvedValueOnce([]);

    await listRooms();

    expect(mockPrisma.room.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: RoomStatus.ACTIVE,
        }),
      }),
    );
  });

  it("gets room by id with branch and amenities", async () => {
    mockPrisma.room.findUnique.mockResolvedValueOnce(null);

    await getRoomById("room_1");

    expect(mockPrisma.room.findUnique).toHaveBeenCalledWith({
      where: { id: "room_1" },
      include: {
        branch: true,
        amenities: {
          include: {
            amenity: true,
          },
        },
      },
    });
  });

  it("deduplicates amenities when creating a room", async () => {
    mockPrisma.room.create.mockResolvedValueOnce({ id: "room_1" });

    await createRoom({
      branchId: "branch_1",
      name: "Meeting Room",
      capacity: 8,
      hourlyRate: 450,
      status: RoomStatus.ACTIVE,
      amenityIds: ["amenity_1", "amenity_1", "amenity_2"],
    });

    expect(mockPrisma.room.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amenities: {
            create: [{ amenityId: "amenity_1" }, { amenityId: "amenity_2" }],
          },
        }),
      }),
    );
  });

  it("deduplicates amenities when updating a room", async () => {
    mockPrisma.room.update.mockResolvedValueOnce({ id: "room_1" });

    await updateRoom({
      id: "room_1",
      amenityIds: ["amenity_1", "amenity_1", "amenity_2"],
    });

    expect(mockPrisma.roomAmenity.createMany).toHaveBeenCalledWith({
      data: [
        { roomId: "room_1", amenityId: "amenity_1" },
        { roomId: "room_1", amenityId: "amenity_2" },
      ],
      skipDuplicates: true,
    });
  });
});
