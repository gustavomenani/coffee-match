"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Occupancy } from "@/lib/domain/capacity";

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

export async function getTicketForUser(ticketId: string) {
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
