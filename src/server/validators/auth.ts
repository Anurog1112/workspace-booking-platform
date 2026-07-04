import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8),
});

export const registerSchema = signInSchema.extend({
  fullName: z.string().min(2).max(120),
  phone: z.string().max(30).optional(),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;