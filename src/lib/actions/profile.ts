"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { clientIpFromHeaders } from "@/lib/security/ip";
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

  // Per-IP, not global. "register:global" was one shared 30/min counter for the
  // whole platform, so ~0.5 req/s from a single host blocked every legitimate
  // signup — and launch night, when marketing goes out and more than 30 people
  // sign up in a minute, is exactly when it would fire on real users. The
  // global counter is now a circuit breaker, not a gate.
  const ip = clientIpFromHeaders(await headers());
  const ipAllowed = await rateLimit(`register:ip:${ip}`, 10, 60_000);
  const globalAllowed = await rateLimit("register:global", 600, 60_000);
  if (!ipAllowed || !globalAllowed) {
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

  // Store the civil birth date as noon São Paulo. Without the explicit offset
  // the instant depends on the server's TZ, so the same form submission would
  // land on a different day in dev and in production. Noon (not midnight) keeps
  // the date stable when read from any zone within 12h of São Paulo.
  const birth = new Date(parsed.data.birthDate + "T12:00:00-03:00");
  if (Number.isNaN(birth.getTime())) {
    return { ok: false, error: "Data de nascimento inválida." };
  }
  if (!isAtLeast18(birth)) {
    return { ok: false, error: "É necessário ter 18 anos ou mais." };
  }

  const email = cleanEmail(parsed.data.email);
  if (!(await rateLimit(`register:${email}`, 5, 60 * 60_000))) {
    return { ok: false, error: "Muitas tentativas para este e-mail." };
  }

  const phone = cleanPhone(parsed.data.phone);
  if (phone.replace(/\D/g, "").length < 10) {
    return { ok: false, error: "Telefone inválido." };
  }

  // Hash BEFORE the existence check so an already-registered e-mail and a fresh
  // one take the same wall-clock time. The old order returned immediately on
  // "exists" (no bcrypt) but paid ~200ms of bcrypt for a new e-mail — a timing
  // oracle that confirms account membership on an 18+ dating platform, which
  // login (dummy-hash) and password reset (constant-time) both go out of their
  // way to prevent. (The explicit "E-mail já cadastrado" message is a separate,
  // product-level enumeration tradeoff — see project notes.)
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return { ok: false, error: "E-mail já cadastrado." };

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
