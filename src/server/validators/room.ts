import { RoomStatus } from "@prisma/client";
import { z } from "zod";

export const roomSearchSchema = z
  .object({
    branchId: z.string().optional(),
    capacity: z.coerce.number().int().positive().optional(),
    status: z.nativeEnum(RoomStatus).optional(),
    startAt: z.coerce.date().optional(),
    endAt: z.coerce.date().optional(),
  })
  .refine((data) => (data.startAt && data.endAt) || (!data.startAt && !data.endAt), {
    message: "Start and end time must be provided together.",
    path: ["endAt"],
  })
  .refine((data) => !data.startAt || !data.endAt || data.endAt > data.startAt, {
    message: "Search end time must be after start time.",
    path: ["endAt"],
  });

export const createRoomSchema = z.object({
  branchId: z.string().min(1),
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
  capacity: z.coerce.number().int().positive(),
  hourlyRate: z.coerce.number().nonnegative(),
  imageUrl: z.string().url().optional(),
  status: z.nativeEnum(RoomStatus).default(RoomStatus.ACTIVE),
  amenityIds: z.array(z.string().min(1)).default([]),
});

export const updateRoomSchema = createRoomSchema.partial().extend({
  id: z.string().min(1),
});

export type RoomSearchInput = z.infer<typeof roomSearchSchema>;
export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
