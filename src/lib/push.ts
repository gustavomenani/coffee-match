import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import { getEnv } from "@/lib/env";

export type PushPayload = {
  title: string;
  body: string;
  url: string;
};

/** True when the three VAPID env vars are present (feature enabled). */
export function isPushConfigured(): boolean {
  const env = getEnv();
  return Boolean(
    env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT
  );
}

/** VAPID public key for the client, or null when push is disabled. */
export function getVapidPublicKeyFromEnv(): string | null {
  return isPushConfigured() ? getEnv().VAPID_PUBLIC_KEY! : null;
}

let vapidApplied = false;

/**
 * Lazily applies the VAPID details to web-push (only when we actually send).
 * Returns false when push is not configured.
 */
function ensureWebPush(): boolean {
  if (!isPushConfigured()) return false;
  if (!vapidApplied) {
    const env = getEnv();
    webpush.setVapidDetails(
      env.VAPID_SUBJECT!,
      env.VAPID_PUBLIC_KEY!,
      env.VAPID_PRIVATE_KEY!
    );
    vapidApplied = true;
  }
  return true;
}

/**
 * Sends a Web Push notification to every subscription of a user.
 * Best-effort: dead endpoints (404/410) are pruned, other failures are
 * logged, and this function never throws. No-op when push is disabled.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<void> {
  try {
    if (!ensureWebPush()) return;

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });
    if (subscriptions.length === 0) return;

    const body = JSON.stringify(payload);

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Endpoint morto (usuário desinstalou/limpou o navegador): remove.
          await prisma.pushSubscription
            .delete({ where: { id: sub.id } })
            .catch(() => {});
        } else {
          console.error("[push] send failed", sub.endpoint, err);
        }
      }
    }
  } catch (err) {
    // Push é best-effort: nunca pode quebrar a ação que o disparou.
    console.error("[push] sendPushToUser failed", userId, err);
  }
}
