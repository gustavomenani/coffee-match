"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { cleanEmail } from "@/lib/security/sanitize";
import { clientIpFromHeaders } from "@/lib/security/ip";
import { auditLog } from "@/lib/audit";
import { parseCuid } from "@/lib/security/ids";

import type { ActionResult } from "@/lib/action-result";

const emailSchema = z.string().email().max(200);

/**
 * "Avise-me" waitlist: registers interest in an event by e-mail.
 * Always resolves to a generic success for any valid e-mail — duplicates,
 * throttled requests and unknown events are indistinguishable to the caller.
 */
export async function registerEventInterest(
  formData: FormData
): Promise<ActionResult> {
  // Honeypot: bots fill hidden fields — pretend success, do nothing.
  if (String(formData.get("_hp") ?? "")) {
    return { ok: true };
  }

  const eventId = parseCuid(formData.get("eventId"));
  if (!eventId) {
    return { ok: false, error: "Evento inválido." };
  }

  const parsedEmail = emailSchema.safeParse(formData.get("email"));
  if (!parsedEmail.success) {
    return { ok: false, error: "Informe um e-mail válido." };
  }
  const email = cleanEmail(parsedEmail.data);

  // Per-IP, not global: "interest:global" was one 30/min counter shared by
  // everyone, so a sold-out event announcement — the exact moment this form
  // matters — would throttle real people. Global is now a circuit breaker.
  const ip = clientIpFromHeaders(await headers());
  const ipAllowed = await rateLimit(`interest:ip:${ip}`, 10, 60_000);
  const emailAllowed = await rateLimit(`interest:${email}`, 3, 60 * 60_000);
  const globalAllowed = await rateLimit("interest:global", 600, 60_000);
  if (!ipAllowed || !emailAllowed || !globalAllowed) {
    await auditLog({
      action: "event.interest_throttled",
      meta: { eventId, email, ip },
    });
    return { ok: true };
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true },
  });
  if (!event) {
    return { ok: true };
  }

  // Idempotent by (eventId, email) — repeating never errors nor leaks a duplicate.
  await prisma.eventInterest.upsert({
    where: { eventId_email: { eventId, email } },
    update: {},
    create: { eventId, email },
  });

  await auditLog({
    action: "event.interest",
    meta: { eventId, email },
  });

  return { ok: true };
}
