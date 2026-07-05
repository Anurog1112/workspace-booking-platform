"use server";

import { Role, RoomStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createAmenity, createRoom, updateRoom } from "@/server/services/room-service";
import { requireRole } from "@/server/guards";
import { createRoomSchema } from "@/server/validators/room";

const amenitySchema = z.object({
  name: z.string().trim().min(2).max(80),
  icon: z.string().trim().max(40).optional(),
});

function getActionErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

export async function createAmenityAction(formData: FormData) {
  await requireRole([Role.SUPER_ADMIN]);
  let target = "/admin?amenityCreated=1";

  try {
    const parsed = amenitySchema.parse({
      name: formData.get("name"),
      icon: formData.get("icon") || undefined,
    });

    await createAmenity(parsed);
  } catch (error) {
    target = `/admin?error=${encodeURIComponent(getActionErrorMessage(error, "Amenity could not be created."))}`;
  }

  revalidatePath("/admin");
  redirect(target);
}

export async function createRoomAction(formData: FormData) {
  await requireRole([Role.SUPER_ADMIN]);
  let target = "/admin?roomCreated=1";

  try {
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
  } catch (error) {
    target = `/admin?error=${encodeURIComponent(getActionErrorMessage(error, "Room could not be created."))}`;
  }

  revalidatePath("/admin");
  redirect(target);
}

export async function updateRoomStatusAction(formData: FormData) {
  await requireRole([Role.SUPER_ADMIN]);
  let target = "/admin?roomUpdated=1";

  try {
    await updateRoom({
      id: z.string().min(1).parse(formData.get("roomId")),
      status: z.nativeEnum(RoomStatus).parse(formData.get("status")),
    });
  } catch (error) {
    target = `/admin?error=${encodeURIComponent(getActionErrorMessage(error, "Room status could not be updated."))}`;
  }

  revalidatePath("/admin");
  redirect(target);
}
