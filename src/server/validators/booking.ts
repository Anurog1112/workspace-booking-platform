import { z } from "zod";

export const createBookingSchema = z
  .object({
    roomId: z.string().min(1),
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
    attendeeCount: z.coerce.number().int().positive(),
    purpose: z.string().max(1000).optional(),
  })
  .refine((data) => data.endAt > data.startAt, {
    message: "Booking end time must be after start time.",
    path: ["endAt"],
  })
  .refine((data) => data.startAt > new Date(), {
    message: "Booking start time must be in the future.",
    path: ["startAt"],
  });

export const bookingIdSchema = z.object({
  bookingId: z.string().min(1),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type BookingIdInput = z.infer<typeof bookingIdSchema>;
