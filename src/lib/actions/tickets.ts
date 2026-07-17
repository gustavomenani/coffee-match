"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { shouldMarkSoldOut } from "@/lib/domain/capacity";
import { getEventOccupancy } from "@/lib/occupancy";
import { bustEventCaches } from "@/lib/cache-bust";
import { parseCuid } from "@/lib/security/ids";
import { sendSpotOpenedEmail } from "@/lib/notify";
import { isPushConfigured, sendPushToUser } from "@/lib/push";
import { auditLog } from "@/lib/audit";
import type { ActionResult } from "@/lib/action-result";

/** Mark published → sold_out when both genders are full; reverse when capacity frees. */
export async function syncEventSoldOutStatus(eventId: string): Promise<void> {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return;
  if (event.status !== "published" && event.status !== "sold_out") return;

  const occ = await getEventOccupancy(eventId);
  const fullySoldOut = shouldMarkSoldOut(event, occ);

  if (fullySoldOut && event.status === "published") {
    await prisma.event.update({
      where: { id: eventId },
      data: { status: "sold_out" },
    });
    bustEventCaches(event.slug);
  } else if (!fullySoldOut && event.status === "sold_out") {
    await prisma.event.update({
      where: { id: eventId },
      data: { status: "published" },
    });
    bustEventCaches(event.slug);
    await notifyWaitlistSpotOpened(event);
  }
}

/**
 * Bounded per transition: this runs inside the Mercado Pago webhook, which must
 * answer before MP times out and retries. `batchFull` in the audit meta flags
 * when a waitlist outgrew one pass.
 */
const WAITLIST_BATCH = 50;

/** Notify up to WAITLIST_BATCH not-yet-notified interested people that a spot opened. */
async function notifyWaitlistSpotOpened(event: {
  id: string;
  title: string;
  slug: string;
  city: string;
}): Promise<void> {
  const interests = await prisma.eventInterest.findMany({
    where: { eventId: event.id, notifiedAt: null },
    take: WAITLIST_BATCH,
    orderBy: { createdAt: "asc" },
  });
  if (interests.length === 0) return;

  // Mark ONLY the addresses the provider accepted. notifiedAt is the dedup
  // filter above, so stamping it on a failed send retires that person from the
  // waitlist forever — Resend down for one minute used to mean 50 people were
  // recorded as notified and never told a spot opened.
  const settled = await Promise.allSettled(
    interests.map((interest) =>
      sendSpotOpenedEmail({
        to: interest.email,
        eventTitle: event.title,
        eventSlug: event.slug,
        city: event.city,
      })
    )
  );

  const notifiedIds: string[] = [];
  const notifiedEmails: string[] = [];
  settled.forEach((result, idx) => {
    if (result.status === "fulfilled" && result.value) {
      notifiedIds.push(interests[idx].id);
      notifiedEmails.push(interests[idx].email);
    } else if (result.status === "rejected") {
      console.error(
        "[waitlist] spot-opened e-mail threw",
        interests[idx].email,
        result.reason
      );
    }
  });

  // O waitlist é por e-mail (pode não ter conta): envia push só para os
  // e-mails que correspondem a usuários cadastrados, além do e-mail.
  if (isPushConfigured() && notifiedEmails.length > 0) {
    const users = await prisma.user.findMany({
      where: { email: { in: [...new Set(notifiedEmails)] } },
      select: { id: true },
    });
    await Promise.allSettled(
      users.map((user) =>
        sendPushToUser(user.id, {
          title: "Abriu vaga! ☕",
          body: `Uma vaga acabou de abrir em "${event.title}" (${event.city}). Garanta a sua!`,
          url: `/eventos/${event.slug}`,
        })
      )
    );
  }

  if (notifiedIds.length > 0) {
    await prisma.eventInterest.updateMany({
      where: { id: { in: notifiedIds } },
      data: { notifiedAt: new Date() },
    });
  }

  await auditLog({
    action: "event.waitlist_notified",
    meta: {
      eventId: event.id,
      slug: event.slug,
      notified: notifiedIds.length,
      failed: interests.length - notifiedIds.length,
      batchFull: interests.length === WAITLIST_BATCH,
    },
  });
}

export async function cancelPendingTicket(
  rawTicketId: string
): Promise<ActionResult> {
  const ticketId = parseCuid(rawTicketId);
  if (!ticketId) {
    return { ok: false, error: "Ingresso inválido." };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Não autenticado." };
  }

  const ticket = await prisma.ticket.findFirst({
    where: {
      id: ticketId,
      userId: session.user.id,
      status: "pending",
    },
    include: {
      event: { select: { id: true, slug: true } },
    },
  });

  if (!ticket) {
    return { ok: false, error: "Pedido pendente não encontrado." };
  }

  // Guard on status, not just id. The findFirst above filtered on "pending",
  // but the webhook can flip this exact ticket to "paid" between that read and
  // this write — the user pays the MP link in one tab and cancels in the other.
  // Keyed on id alone, this cancelled a ticket the buyer had just paid for:
  // money captured, ticket dead, mpPaymentId set so nothing downstream notices.
  const cancelled = await prisma.ticket.updateMany({
    where: { id: ticket.id, status: "pending" },
    data: { status: "cancelled" },
  });

  if (cancelled.count === 0) {
    return { ok: false, error: "Este pedido já foi pago ou cancelado." };
  }

  await syncEventSoldOutStatus(ticket.eventId);
  bustEventCaches(ticket.event.slug);

  revalidatePath("/meus-ingressos");
  revalidatePath(`/meus-ingressos/${ticket.id}`);
  revalidatePath(`/eventos/${ticket.event.slug}`);
  revalidatePath("/admin");
  revalidatePath("/admin/eventos");

  return { ok: true };
}
