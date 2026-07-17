"use server";

import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { cleanEmail } from "@/lib/security/sanitize";
import { auditLog } from "@/lib/audit";
import { sendEmail } from "@/lib/notify";
import { appBaseUrl } from "@/lib/env";

import type { ActionResult } from "@/lib/action-result";

/** Token lifetime: 1 hour. */
const TOKEN_TTL_MS = 60 * 60_000;

const emailSchema = z.string().email().max(200);

/** Same password policy as registerSchema (src/lib/validations/auth.ts). */
const resetSchema = z.object({
  token: z.string().min(1).max(200),
  password: z
    .string()
    .min(8)
    .max(100)
    .regex(/[A-Za-z]/, "Senha deve conter letras")
    .regex(/[0-9]/, "Senha deve conter números"),
  passwordConfirm: z.string().min(1).max(100),
});

/** Only the SHA-256 of the token is persisted — a DB leak can't reuse links. */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Starts the "forgot password" flow.
 * Always resolves to a generic success so account existence is never leaked —
 * rate-limited, unknown, and known e-mails are indistinguishable to the caller.
 */
export async function requestPasswordReset(
  formData: FormData
): Promise<ActionResult> {
  // Honeypot: bots fill hidden fields — pretend success, do nothing.
  if (String(formData.get("_hp") ?? "")) {
    return { ok: true };
  }

  const parsedEmail = emailSchema.safeParse(formData.get("email"));
  if (!parsedEmail.success) {
    return { ok: false, error: "Informe um e-mail válido." };
  }
  const email = cleanEmail(parsedEmail.data);

  // Evaluate both limits (no short-circuit) so the global counter stays accurate.
  const emailAllowed = await rateLimit(`pwreset:${email}`, 3, 60 * 60_000);
  const globalAllowed = await rateLimit("pwreset:global", 20, 60 * 60_000);
  if (!emailAllowed || !globalAllowed) {
    await auditLog({
      action: "user.password_reset_throttled",
      meta: { email },
    });
    return { ok: true };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { ok: true };
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  // A new request invalidates every previous token for this user.
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
    prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashToken(token), expiresAt },
    }),
  ]);

  const resetUrl = `${appBaseUrl()}/redefinir-senha?token=${token}`;

  const text = [
    "Olá!",
    "",
    "Recebemos um pedido para redefinir a senha da sua conta no Coffee Match.",
    `Para escolher uma nova senha, acesse: ${resetUrl}`,
    "",
    "O link vale por 1 hora e só pode ser usado uma vez.",
    "Se você não pediu a redefinição, ignore este e-mail — nada muda na sua conta.",
    "",
    "Coffee Match — conectando pessoas, uma xícara por vez.",
  ].join("\n");

  const html = [
    `<p>Olá!</p>`,
    `<p>Recebemos um pedido para redefinir a senha da sua conta no <strong>Coffee Match</strong>.</p>`,
    `<p><a href="${resetUrl}">Redefinir minha senha</a></p>`,
    `<p>O link vale por 1 hora e só pode ser usado uma vez.</p>`,
    `<p>Se você não pediu a redefinição, ignore este e-mail — nada muda na sua conta.</p>`,
  ].join("");

  await sendEmail({
    to: email,
    subject: "Redefinição de senha | Coffee Match",
    text,
    html,
    auditAction: "notify.password_reset",
  });

  await auditLog({
    actorId: user.id,
    action: "user.password_reset_request",
    meta: { email },
  });

  return { ok: true };
}

/**
 * Completes the flow: validates the token + new password and swaps the hash.
 * Token failures always return the same generic message.
 */
export async function resetPassword(
  formData: FormData
): Promise<ActionResult> {
  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    passwordConfirm: formData.get("passwordConfirm"),
  });
  if (!parsed.success) {
    const tokenIssue = parsed.error.issues.some((i) => i.path[0] === "token");
    if (tokenIssue) {
      return { ok: false, error: "Link inválido ou expirado." };
    }
    return {
      ok: false,
      error: "A senha deve ter no mínimo 8 caracteres, com letras e números.",
    };
  }
  if (parsed.data.password !== parsed.data.passwordConfirm) {
    return { ok: false, error: "As senhas não coincidem." };
  }

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(parsed.data.token) },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { ok: false, error: "Link inválido ou expirado." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash, failedLoginCount: 0, lockedUntil: null },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.deleteMany({
      where: { userId: record.userId, id: { not: record.id } },
    }),
  ]);

  await auditLog({
    actorId: record.userId,
    action: "user.password_reset",
  });

  return { ok: true };
}
