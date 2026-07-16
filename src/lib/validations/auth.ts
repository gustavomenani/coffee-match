import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(200),
  password: z
    .string()
    .min(8)
    .max(100)
    .regex(/[A-Za-z]/, "Senha deve conter letras")
    .regex(/[0-9]/, "Senha deve conter números"),
  phone: z.string().min(10).max(20),
  gender: z.enum(["male", "female"]),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const loginSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(100),
});

export const profileUpdateSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().min(10).max(20),
  instagram: z.string().max(100).optional().or(z.literal("")),
  photoUrl: z.string().max(120_000).optional().or(z.literal("")),
});
