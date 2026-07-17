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
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((s) => {
      // The regex alone admits calendar-invalid dates (1990-06-31, 1991-02-29,
      // 1990-04-31), and `new Date()` silently ROLLS those forward
      // (2021-02-29 -> 03-01) so downstream age/ballot math would use a different
      // day than submitted. Require the components to survive a UTC round-trip
      // unchanged (timezone-independent — no rollover means a real calendar date).
      const [y, m, d] = s.split("-").map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d));
      return (
        dt.getUTCFullYear() === y &&
        dt.getUTCMonth() === m - 1 &&
        dt.getUTCDate() === d
      );
    }, "Data de nascimento inválida"),
});

export const loginSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(100),
});

export const profileUpdateSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().min(10).max(20),
  instagram: z.string().max(100).optional().or(z.literal("")),
  bio: z.string().max(160).optional().or(z.literal("")),
  photoUrl: z.string().max(120_000).optional().or(z.literal("")),
});
