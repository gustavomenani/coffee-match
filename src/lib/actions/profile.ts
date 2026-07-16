"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { registerSchema, profileUpdateSchema } from "@/lib/validations/auth";
import { isAtLeast18 } from "@/lib/domain/age";
import { requireUser } from "@/lib/authz";
import { sanitizePhotoInput } from "@/lib/security/photo";
import { auditLog } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function registerUser(formData: FormData): Promise<ActionResult> {
  const ipHint = String(formData.get("_hp") ?? "");
  // Honeypot: bots fill hidden fields
  if (ipHint) {
    return { ok: false, error: "Dados inválidos." };
  }

  if (!rateLimit("register:global", 30, 60_000)) {
    return { ok: false, error: "Muitas tentativas. Aguarde um momento." };
  }

  const acceptTerms = formData.get("acceptTerms");
  if (acceptTerms !== "1" && acceptTerms !== "on") {
    return {
      ok: false,
      error: "É necessário aceitar os Termos e a Política de Privacidade.",
    };
  }

  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    phone: formData.get("phone"),
    gender: formData.get("gender"),
    birthDate: formData.get("birthDate"),
  });
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const birth = new Date(parsed.data.birthDate + "T12:00:00");
  if (!isAtLeast18(birth)) {
    return { ok: false, error: "É necessário ter 18 anos ou mais." };
  }

  const email = parsed.data.email.toLowerCase();
  if (!rateLimit(`register:${email}`, 5, 60 * 60_000)) {
    return { ok: false, error: "Muitas tentativas para este e-mail." };
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return { ok: false, error: "E-mail já cadastrado." };

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name.trim(),
      email,
      passwordHash,
      phone: parsed.data.phone.replace(/\s+/g, ""),
      gender: parsed.data.gender,
      birthDate: birth,
    },
  });

  await auditLog({
    actorId: user.id,
    action: "user.register",
    meta: { email },
  });

  return { ok: true };
}

export async function updateProfile(formData: FormData): Promise<ActionResult> {
  const authz = await requireUser();
  if (!authz.ok) return authz;

  const parsed = profileUpdateSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    instagram: formData.get("instagram") || "",
    photoUrl: formData.get("photoUrl") || "",
  });
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const photo = sanitizePhotoInput(parsed.data.photoUrl || "");
  if (!photo.ok) return { ok: false, error: photo.error };

  await prisma.user.update({
    where: { id: authz.user.id },
    data: {
      name: parsed.data.name.trim(),
      phone: parsed.data.phone.replace(/\s+/g, ""),
      instagram: parsed.data.instagram?.replace(/^@/, "") || null,
      photoUrl: photo.value,
    },
  });

  revalidatePath("/minha-conta");
  return { ok: true };
}
