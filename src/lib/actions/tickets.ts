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

/** Notify up to 50 not-yet-notified interested people that a spot opened. */
async function notifyWaitlistSpotOpened(event: {
  id: string;
  title: string;
  slug: string;
  city: string;
}): Promise<void> {
  const interests = await prisma.eventInterest.findMany({
    where: { eventId: event.id, notifiedAt: null },
    take: 50,
    orderBy: { createdAt: "asc" },
  });
  if (interests.length === 0) return;

  for (const interest of interests) {
    try {
      await sendSpotOpenedEmail({
        to: interest.email,
        eventTitle: event.title,
        eventSlug: event.slug,
        city: event.city,
      });
    } catch (err) {
      // sendEmail is already defensive, but one bad recipient must not block the rest.
      console.error("[waitlist] spot-opened e-mail failed", interest.email, err);
    }
  }

  // O waitlist é por e-mail (pode não ter conta): envia push só para os
  // e-mails que correspondem a usuários cadastrados, além do e-mail.
  if (isPushConfigured()) {
    const emails = [...new Set(interests.map((i) => i.email))];
    const users = await prisma.user.findMany({
      where: { email: { in: emails } },
      select: { id: true },
    });
    for (const user of users) {
      await sendPushToUser(user.id, {
        title: "Abriu vaga! ☕",
        body: `Uma vaga acabou de abrir em "${event.title}" (${event.city}). Garanta a sua!`,
        url: `/eventos/${event.slug}`,
      });
    }
  }

  await prisma.eventInterest.updateMany({
    where: { id: { in: interests.map((i) => i.id) } },
    data: { notifiedAt: new Date() },
  });

  await auditLog({
    action: "event.waitlist_notified",
    meta: { eventId: event.id, slug: event.slug, notified: interests.length },
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

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: { status: "cancelled" },
  });

  await syncEventSoldOutStatus(ticket.eventId);
  bustEventCaches(ticket.event.slug);

  revalidatePath("/meus-ingressos");
  revalidatePath(`/meus-ingressos/${ticket.id}`);
  revalidatePath(`/eventos/${ticket.event.slug}`);
  revalidatePath("/admin");
  revalidatePath("/admin/eventos");

  return { ok: true };
}

export async function getMyTickets() {
  const session = await auth();
  if (!session?.user?.id) return [];

  return prisma.ticket.findMany({
    where: { userId: session.user.id },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          slug: true,
          venue: true,
          city: true,
          startsAt: true,
          endsAt: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getTicketForUser(rawTicketId: string) {
  const ticketId = parseCuid(rawTicketId);
  if (!ticketId) return null;

  const session = await auth();
  if (!session?.user?.id) return null;

  return prisma.ticket.findFirst({
    where: { id: ticketId, userId: session.user.id },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          slug: true,
          venue: true,
          city: true,
          startsAt: true,
          status: true,
        },
      },
    },
  });
}
