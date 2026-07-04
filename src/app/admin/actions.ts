"use server";

import { Role, RoomStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createAmenity, createRoom, updateRoom } from "@/server/services/room-service";
import { requireRole } from "@/server/guards";
import { createRoomSchema } from "@/server/validators/room";

const amenitySchema = z.object({
  name: z.string().trim().min(2).max(80),
  icon: z.string().trim().max(40).optional(),
});

export async function createAmenityAction(formData: FormData) {
  await requireRole([Role.SUPER_ADMIN]);

  const parsed = amenitySchema.parse({
    name: formData.get("name"),
    icon: formData.get("icon") || undefined,
  });

  await createAmenity(parsed);
  revalidatePath("/admin");
}

export async function createRoomAction(formData: FormData) {
  await requireRole([Role.SUPER_ADMIN]);

  const parsed = createRoomSchema.parse({
    branchId: formData.get("branchId"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    capacity: formData.get("capacity"),
    hourlyRate: formData.get("hourlyRate"),
    imageUrl: formData.get("imageUrl") || undefined,
    status: formData.get("status") || RoomStatus.ACTIVE,
    amenityIds: formData.getAll("amenityIds"),
  });

  await createRoom(parsed);
  revalidatePath("/admin");
}

export async function updateRoomStatusAction(formData: FormData) {
  await requireRole([Role.SUPER_ADMIN]);

  await updateRoom({
    id: z.string().min(1).parse(formData.get("roomId")),
    status: z.nativeEnum(RoomStatus).parse(formData.get("status")),
  });

  revalidatePath("/admin");
}
