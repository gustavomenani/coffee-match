"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  shouldMarkSoldOut,
  type Occupancy,
} from "@/lib/domain/capacity";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function getEventOccupancy(eventId: string): Promise<Occupancy> {
  const tickets = await prisma.ticket.findMany({
    where: {
      eventId,
      status: { in: ["pending", "paid"] },
    },
    select: {
      status: true,
      user: { select: { gender: true } },
    },
  });

  const occ: Occupancy = {
    paidMen: 0,
    paidWomen: 0,
    pendingMen: 0,
    pendingWomen: 0,
  };

  for (const t of tickets) {
    const isMale = t.user.gender === "male";
    if (t.status === "paid") {
      if (isMale) occ.paidMen += 1;
      else occ.paidWomen += 1;
    } else {
      if (isMale) occ.pendingMen += 1;
      else occ.pendingWomen += 1;
    }
  }

  return occ;
}

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
  } else if (!fullySoldOut && event.status === "sold_out") {
    await prisma.event.update({
      where: { id: eventId },
      data: { status: "published" },
    });
  }
}

export async function cancelPendingTicket(
  rawTicketId: string
): Promise<ActionResult> {
  const { parseCuid } = await import("@/lib/security/ids");
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

  revalidatePath("/meus-ingressos");
  revalidatePath(`/meus-ingressos/${ticket.id}`);
  revalidatePath("/eventos");
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
  const { parseCuid } = await import("@/lib/security/ids");
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
