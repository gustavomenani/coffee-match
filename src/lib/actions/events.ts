"use server";

import { prisma } from "@/lib/prisma";
import {
  remainingSpots,
  type Occupancy,
} from "@/lib/domain/capacity";

export type EventWithSpots = {
  id: string;
  title: string;
  slug: string;
  venue: string;
  address: string;
  city: string;
  startsAt: Date;
  endsAt: Date;
  capacityMen: number;
  capacityWomen: number;
  priceCents: number;
  currency: string;
  status: string;
  remainingMen: number;
  remainingWomen: number;
};

function occupancyFromTickets(
  tickets: { status: string; user: { gender: string } }[]
): Occupancy {
  const occ: Occupancy = {
    paidMen: 0,
    paidWomen: 0,
    pendingMen: 0,
    pendingWomen: 0,
  };
  for (const t of tickets) {
    if (t.status === "paid") {
      if (t.user.gender === "male") occ.paidMen += 1;
      else occ.paidWomen += 1;
    } else if (t.status === "pending") {
      if (t.user.gender === "male") occ.pendingMen += 1;
      else occ.pendingWomen += 1;
    }
  }
  return occ;
}

async function getOccupancy(eventId: string): Promise<Occupancy> {
  const rows = await prisma.ticket.findMany({
    where: { eventId, status: { in: ["pending", "paid"] } },
    include: { user: { select: { gender: true } } },
  });
  return occupancyFromTickets(rows);
}

function withSpots<
  T extends {
    id: string;
    capacityMen: number;
    capacityWomen: number;
  },
>(event: T, occ: Occupancy): T & { remainingMen: number; remainingWomen: number } {
  return {
    ...event,
    remainingMen: remainingSpots(event, "male", occ),
    remainingWomen: remainingSpots(event, "female", occ),
  };
}

export async function listPublishedEvents(): Promise<EventWithSpots[]> {
  const events = await prisma.event.findMany({
    where: { status: { in: ["published", "sold_out", "live"] } },
    orderBy: { startsAt: "asc" },
  });

  const result: EventWithSpots[] = [];
  for (const event of events) {
    const occ = await getOccupancy(event.id);
    result.push(withSpots(event, occ));
  }
  return result;
}

export async function getEventBySlug(
  slug: string
): Promise<EventWithSpots | null> {
  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) return null;
  if (!["published", "sold_out", "live", "closed"].includes(event.status)) {
    return null;
  }
  const occ = await getOccupancy(event.id);
  return withSpots(event, occ);
}
