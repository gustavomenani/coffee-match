"use server";

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { remainingSpots, type Occupancy } from "@/lib/domain/capacity";

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

function withSpots<
  T extends {
    id: string;
    capacityMen: number;
    capacityWomen: number;
  },
>(
  event: T,
  occ: Occupancy
): T & { remainingMen: number; remainingWomen: number } {
  return {
    ...event,
    remainingMen: remainingSpots(event, "male", occ),
    remainingWomen: remainingSpots(event, "female", occ),
  };
}

/** Single query: events + tickets (no N+1). */
async function fetchPublishedEventsWithSpots(): Promise<EventWithSpots[]> {
  const events = await prisma.event.findMany({
    where: { status: { in: ["published", "sold_out", "live"] } },
    orderBy: { startsAt: "asc" },
    include: {
      tickets: {
        where: { status: { in: ["pending", "paid"] } },
        select: {
          status: true,
          user: { select: { gender: true } },
        },
      },
    },
  });

  return events.map((row) => {
    const { tickets, ...event } = row;
    return withSpots(event, occupancyFromTickets(tickets));
  });
}

/**
 * Cached for 30s — keeps list snappy under traffic.
 * Bust with revalidatePath('/eventos') after sales/admin edits.
 */
export async function listPublishedEvents(): Promise<EventWithSpots[]> {
  return unstable_cache(
    fetchPublishedEventsWithSpots,
    ["published-events-with-spots-v1"],
    { revalidate: 30 }
  )();
}

export async function getEventBySlug(
  slug: string
): Promise<EventWithSpots | null> {
  if (!/^[a-z0-9-]{3,80}$/.test(slug)) return null;

  return unstable_cache(
    async () => {
      const row = await prisma.event.findUnique({
        where: { slug },
        include: {
          tickets: {
            where: { status: { in: ["pending", "paid"] } },
            select: {
              status: true,
              user: { select: { gender: true } },
            },
          },
        },
      });
      if (!row) return null;
      if (!["published", "sold_out", "live", "closed"].includes(row.status)) {
        return null;
      }
      const { tickets, ...event } = row;
      return withSpots(event, occupancyFromTickets(tickets));
    },
    [`event-slug-v1-${slug}`],
    { revalidate: 20 }
  )();
}
