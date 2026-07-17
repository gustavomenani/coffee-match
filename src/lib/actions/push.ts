"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { auditLog } from "@/lib/audit";
import { getVapidPublicKeyFromEnv } from "@/lib/push";
import type { ActionResult } from "@/lib/action-result";

/**
 * Public VAPID key for the browser to subscribe.
 * Returns null when Web Push is not configured (feature off) — the client
 * hides the toggle in that case. Avoids duplicating the key as NEXT_PUBLIC_.
 */
export async function getVapidPublicKey(): Promise<string | null> {
  return getVapidPublicKeyFromEnv();
}

const subscriptionSchema = z.object({
  endpoint: z
    .string()
    .url()
    .max(2000)
    .refine((v) => v.startsWith("https://"), "Endpoint deve ser https."),
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(512),
  }),
});

export async function savePushSubscription(sub: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}): Promise<ActionResult> {
  const authed = await requireUser();
  if (!authed.ok) return authed;

  const parsed = subscriptionSchema.safeParse(sub);
  if (!parsed.success) {
    return { ok: false, error: "Inscrição de push inválida." };
  }
  const { endpoint, keys } = parsed.data;

  // Endpoint é único por navegador/perfil: se já existir para outro usuário
  // (troca de conta no mesmo aparelho), o dono passa a ser o usuário atual.
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: {
      userId: authed.user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
    update: {
      userId: authed.user.id,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
  });

  await auditLog({
    actorId: authed.user.id,
    action: "push.subscribed",
    meta: { endpoint },
  });

  return { ok: true };
}

export async function removePushSubscription(
  endpoint: string
): Promise<ActionResult> {
  const authed = await requireUser();
  if (!authed.ok) return authed;

  if (typeof endpoint !== "string" || endpoint.length === 0) {
    return { ok: false, error: "Endpoint inválido." };
  }

  // deleteMany com filtro de dono: só remove se pertencer ao usuário logado.
  const deleted = await prisma.pushSubscription.deleteMany({
    where: { endpoint, userId: authed.user.id },
  });

  if (deleted.count > 0) {
    await auditLog({
      actorId: authed.user.id,
      action: "push.unsubscribed",
      meta: { endpoint },
    });
  }

  return { ok: true };
}
