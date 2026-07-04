import { z } from "zod";

export const submitPaymentProofSchema = z.object({
  bookingId: z.string().min(1),
  proofFileUrl: z.string().url(),
});

export const reviewPaymentSchema = z
  .object({
    bookingId: z.string().min(1),
    approved: z.boolean(),
    rejectionReason: z.string().trim().min(1).max(1000).optional(),
  })
  .refine((data) => data.approved || Boolean(data.rejectionReason?.trim()), {
    message: "Rejection reason is required when payment is rejected.",
    path: ["rejectionReason"],
  });

export type SubmitPaymentProofInput = z.infer<typeof submitPaymentProofSchema>;
export type ReviewPaymentInput = z.infer<typeof reviewPaymentSchema>;
