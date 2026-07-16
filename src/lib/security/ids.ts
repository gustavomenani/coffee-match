import { z } from "zod";

/** CUID-like ids used by Prisma @default(cuid()) */
export const cuidSchema = z
  .string()
  .min(20)
  .max(40)
  .regex(/^[a-z][a-z0-9]+$/i, "ID inválido");

export function parseCuid(raw: unknown): string | null {
  const r = cuidSchema.safeParse(raw);
  return r.success ? r.data : null;
}

export function assertCuid(raw: unknown, label = "id"): string {
  const id = parseCuid(raw);
  if (!id) throw new Error(`${label} inválido`);
  return id;
}
