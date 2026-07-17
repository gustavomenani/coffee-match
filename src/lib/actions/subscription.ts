"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { rateLimit } from "@/lib/rate-limit";
import { auditLog } from "@/lib/audit";
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

  const existing = await prisma.subscription.findUnique({
    where: { userId: user.id },
  });
  if (existing?.status === "active") {
    return { ok: false, error: "Você já é assinante." };
  }

  if (isMpDevBypass()) {
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

  try {
    const { preapprovalId, initPoint } = await createSubscriptionPreapproval({
      userId: user.id,
      payerEmail: user.email,
    });
    await prisma.subscription.upsert({
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
  } catch (err) {
    console.error("[subscription] preapproval failed", err);
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
      console.error("[subscription] cancel failed", err);
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
