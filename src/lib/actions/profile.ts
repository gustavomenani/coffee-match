"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema, profileUpdateSchema } from "@/lib/validations/auth";
import { isAtLeast18 } from "@/lib/domain/age";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function registerUser(formData: FormData): Promise<ActionResult> {
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
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return { ok: false, error: "E-mail já cadastrado." };

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash,
      phone: parsed.data.phone,
      gender: parsed.data.gender,
      birthDate: birth,
    },
  });

  return { ok: true };
}

export async function updateProfile(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Não autenticado." };

  const parsed = profileUpdateSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    instagram: formData.get("instagram") || "",
    photoUrl: formData.get("photoUrl") || "",
  });
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone,
      instagram: parsed.data.instagram || null,
      photoUrl: parsed.data.photoUrl || null,
    },
  });
  revalidatePath("/minha-conta");
  return { ok: true };
}
