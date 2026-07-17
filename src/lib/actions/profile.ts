"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { registerSchema, profileUpdateSchema } from "@/lib/validations/auth";
import { isAtLeast18 } from "@/lib/domain/age";
import { sanitizeInterests } from "@/lib/domain/interests";
import { requireUser } from "@/lib/authz";
import { sanitizePhotoInput } from "@/lib/security/photo";
import { auditLog } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import {
  cleanEmail,
  cleanInstagram,
  cleanPhone,
  cleanText,
} from "@/lib/security/sanitize";

import type { ActionResult } from "@/lib/action-result";

export async function registerUser(formData: FormData): Promise<ActionResult> {
  const ipHint = String(formData.get("_hp") ?? "");
  // Honeypot: bots fill hidden fields
  if (ipHint) {
    return { ok: false, error: "Dados inválidos." };
  }

  if (!(await rateLimit("register:global", 30, 60_000))) {
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

  const email = cleanEmail(parsed.data.email);
  if (!(await rateLimit(`register:${email}`, 5, 60 * 60_000))) {
    return { ok: false, error: "Muitas tentativas para este e-mail." };
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return { ok: false, error: "E-mail já cadastrado." };

  const phone = cleanPhone(parsed.data.phone);
  if (phone.replace(/\D/g, "").length < 10) {
    return { ok: false, error: "Telefone inválido." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  let user;
  try {
    user = await prisma.user.create({
      data: {
        name: cleanText(parsed.data.name, 100),
        email,
        passwordHash,
        phone,
        gender: parsed.data.gender,
        birthDate: birth,
      },
    });
  } catch (err) {
    // Race with a concurrent registration for the same e-mail: the earlier
    // findUnique passed but the unique constraint fired on create.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return { ok: false, error: "E-mail já cadastrado." };
    }
    throw err;
  }

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

  // Mutável e aceita foto em data URL (~120KB): limite por usuário, como as
  // demais actions mutáveis (registerUser, castVote, startSubscription...).
  if (!(await rateLimit(`profile:${authz.user.id}`, 10, 60_000))) {
    return { ok: false, error: "Muitas tentativas. Aguarde um momento." };
  }

  const parsed = profileUpdateSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    instagram: formData.get("instagram") || "",
    bio: formData.get("bio") || "",
    photoUrl: formData.get("photoUrl") || "",
  });
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const photo = sanitizePhotoInput(parsed.data.photoUrl || "");
  if (!photo.ok) return { ok: false, error: photo.error };

  const phone = cleanPhone(parsed.data.phone);
  if (phone.replace(/\D/g, "").length < 10) {
    return { ok: false, error: "Telefone inválido." };
  }
  const ig = cleanInstagram(parsed.data.instagram || "");
  if (parsed.data.instagram && !ig) {
    return { ok: false, error: "Instagram inválido." };
  }

  const bio = cleanText(parsed.data.bio || "", 160);
  const interests = sanitizeInterests(formData.getAll("interests"));

  await prisma.user.update({
    where: { id: authz.user.id },
    data: {
      name: cleanText(parsed.data.name, 100),
      phone,
      instagram: ig,
      bio: bio || null,
      photoUrl: photo.value,
      interests,
    },
  });

  revalidatePath("/minha-conta");
  return { ok: true };
}
