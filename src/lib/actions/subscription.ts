"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { rateLimit } from "@/lib/rate-limit";
import { auditLog } from "@/lib/audit";
import { logError } from "@/lib/observability";
import {
  cancelPreapproval,
  createSubscriptionPreapproval,
  isMpDevBypass,
} from "@/lib/mercadopago";

export type SubscribeResult =
  | { ok: true; initPoint: string }
  | { ok: false; error: string };

export type CancelResult = { ok: true } | { ok: false; error: string };

export async function startSubscription(): Promise<SubscribeResult> {
  const authz = await requireUser();
  if (!authz.ok) return { ok: false, error: authz.error };
  const user = authz.user;

  if (!(await rateLimit(`subscribe:${user.id}`, 5, 60_000))) {
    return { ok: false, error: "Muitas tentativas. Aguarde um momento." };
  }

  // Dev bypass: no Mercado Pago round-trip, so no concurrency hazard — activate
  // locally. The active-guard read stays here for this path only.
  if (isMpDevBypass()) {
    const existing = await prisma.subscription.findUnique({
      where: { userId: user.id },
    });
    if (existing?.status === "active") {
      return { ok: false, error: "Você já é assinante." };
    }
    await prisma.subscription.upsert({
      where: { userId: user.id },
      update: {
        status: "active",
        activatedAt: new Date(),
        cancelledAt: null,
        mpPreapprovalId: null,
      },
      create: {
        userId: user.id,
        status: "active",
        activatedAt: new Date(),
      },
    });
    await auditLog({
      actorId: user.id,
      action: "subscription.activated",
      meta: { via: "dev_bypass" },
    });
    revalidatePath("/assinatura");
    revalidatePath("/minha-conta");
    return { ok: true, initPoint: "/assinatura?ativada=1" };
  }

  // Real MP path, serialized per user with a transaction-scoped advisory lock.
  //
  // Without serialization, two near-simultaneous clicks (the rate limit allows
  // 5/min) both read existing=null, both skip the cancel-old branch below, and
  // both mint a LIVE preapproval — the second upsert overwrites the first's id,
  // orphaning a preapproval MP will bill monthly and cancelSubscription can
  // never reach. The existing cancel-old logic only guards the SEQUENTIAL case.
  //
  // pg_advisory_xact_lock makes the read→cancel-old→create→upsert critical
  // section single-file per user and releases automatically on commit/rollback,
  // so the second request now sees the first's mpPreapprovalId and cancels it.
  // The MP calls run inside the locked section (they use the SDK, not tx), so
  // the lock is held across ~1s of network I/O — acceptable at this app's
  // subscription volume. The generous timeout keeps a slow MP round-trip from
  // aborting the transaction and orphaning a just-created preapproval; the
  // residual (MP hangs past the timeout) is caught by the webhook's
  // duplicate_preapproval alert.
  try {
    return await prisma.$transaction(
      async (tx): Promise<SubscribeResult> => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`subscription:${user.id}`}))`;

        const existing = await tx.subscription.findUnique({
          where: { userId: user.id },
        });
        if (existing?.status === "active") {
          return { ok: false, error: "Você já é assinante." };
        }

        // Best-effort: if MP cannot cancel the stale id, that must not block
        // someone from subscribing. The orphan is audited so it can be found.
        if (existing?.mpPreapprovalId) {
          try {
            await cancelPreapproval(existing.mpPreapprovalId);
          } catch (err) {
            logError("subscription.orphan_cancel_failed", err, {
              preapprovalId: existing.mpPreapprovalId,
            });
            await auditLog({
              actorId: user.id,
              action: "subscription.orphaned_preapproval",
              meta: { preapprovalId: existing.mpPreapprovalId },
            });
          }
        }

        const { preapprovalId, initPoint } =
          await createSubscriptionPreapproval({
            userId: user.id,
            payerEmail: user.email,
          });
        await tx.subscription.upsert({
          where: { userId: user.id },
          update: {
            status: "pending",
            mpPreapprovalId: preapprovalId,
            cancelledAt: null,
          },
          create: {
            userId: user.id,
            status: "pending",
            mpPreapprovalId: preapprovalId,
          },
        });
        await auditLog({
          actorId: user.id,
          action: "subscription.checkout_started",
          meta: { preapprovalId },
        });
        return { ok: true, initPoint };
      },
      { timeout: 20_000, maxWait: 10_000 }
    );
  } catch (err) {
    logError("subscription.preapproval_failed", err, { userId: user.id });
    return {
      ok: false,
      error: "Não foi possível iniciar a assinatura. Tente novamente.",
    };
  }
}

export async function cancelSubscription(): Promise<CancelResult> {
  const authz = await requireUser();
  if (!authz.ok) return { ok: false, error: authz.error };
  const user = authz.user;

  if (!(await rateLimit(`subscribe:${user.id}`, 5, 60_000))) {
    return { ok: false, error: "Muitas tentativas. Aguarde um momento." };
  }

  const sub = await prisma.subscription.findUnique({
    where: { userId: user.id },
  });
  if (!sub || sub.status !== "active") {
    return { ok: false, error: "Você não tem assinatura ativa." };
  }

  if (sub.mpPreapprovalId && !isMpDevBypass()) {
    try {
      await cancelPreapproval(sub.mpPreapprovalId);
    } catch (err) {
      logError("subscription.cancel_failed", err, { userId: user.id });
      return {
        ok: false,
        error: "Falha ao cancelar no Mercado Pago. Tente novamente.",
      };
    }
  }

  await prisma.subscription.update({
    where: { id: sub.id },
    data: { status: "cancelled", cancelledAt: new Date() },
  });
  await auditLog({
    actorId: user.id,
    action: "subscription.cancelled",
    meta: { preapprovalId: sub.mpPreapprovalId },
  });
  revalidatePath("/assinatura");
  revalidatePath("/minha-conta");
  return { ok: true };
}
