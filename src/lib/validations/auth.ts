import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  phone: z.string().min(10).max(20),
  gender: z.enum(["male", "female"]),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const profileUpdateSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().min(10).max(20),
  instagram: z.string().max(100).optional().or(z.literal("")),
  photoUrl: z.string().url().optional().or(z.literal("")),
});
