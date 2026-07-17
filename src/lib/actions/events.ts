"use server";

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  emptyOccupancy,
  remainingSpots,
  type Occupancy,
} from "@/lib/domain/capacity";
import { getOccupancyByEvent, getEventOccupancy } from "@/lib/occupancy";

/** Hard cap for the public listing — the agenda is only upcoming nights. */
const MAX_PUBLIC_EVENTS = 60;

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
  earlyAccessUntil: Date | null;
  remainingMen: number;
  remainingWomen: number;
};

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

/** Two queries total: events + aggregated occupancy (no ticket fan-out). */
async function fetchPublishedEventsWithSpots(): Promise<EventWithSpots[]> {
  const events = await prisma.event.findMany({
    where: { status: { in: ["published", "sold_out", "live"] } },
    orderBy: { startsAt: "asc" },
    take: MAX_PUBLIC_EVENTS,
  });

  const occupancy = await getOccupancyByEvent(events.map((e) => e.id));
  return events.map((event) =>
    withSpots(event, occupancy.get(event.id) ?? emptyOccupancy())
  );
}

/**
 * unstable_cache serializes results to JSON, so Date fields come back as
 * strings on cache hits. Re-hydrate them before handing to consumers.
 */
function reviveEventDates(event: EventWithSpots): EventWithSpots {
  return {
    ...event,
    startsAt: new Date(event.startsAt),
    endsAt: new Date(event.endsAt),
    earlyAccessUntil: event.earlyAccessUntil
      ? new Date(event.earlyAccessUntil)
      : null,
  };
}

/**
 * Cached for 30s — keeps list snappy under traffic.
 * Bust with revalidatePath('/eventos') after sales/admin edits.
 */
export async function listPublishedEvents(): Promise<EventWithSpots[]> {
  const events = await unstable_cache(
    fetchPublishedEventsWithSpots,
    ["published-events-with-spots-v2"],
    { revalidate: 30 }
  )();
  return events.map(reviveEventDates);
}

export type PastEvent = {
  id: string;
  title: string;
  slug: string;
  city: string;
  venue: string;
  startsAt: Date;
};

/**
 * Noites já encerradas (status "closed"), mais recentes primeiro.
 * Cached 300s — histórico muda pouco. O `limit` entra na chave do cache
 * automaticamente por ser argumento da função cacheada.
 */
export async function listPastEvents(limit = 6): Promise<PastEvent[]> {
  const events = await unstable_cache(
    async (take: number) =>
      prisma.event.findMany({
        where: { status: "closed" },
        orderBy: { startsAt: "desc" },
        take,
        select: {
          id: true,
          title: true,
          slug: true,
          city: true,
          venue: true,
          startsAt: true,
        },
      }),
    ["past-events-v1"],
    { revalidate: 300 }
  )(limit);

  // Mesmo motivo do reviveEventDates: cache hits serializam Date como string.
  return events.map((event) => ({
    ...event,
    startsAt: new Date(event.startsAt),
  }));
}

export async function getEventBySlug(
  slug: string
): Promise<EventWithSpots | null> {
  if (!/^[a-z0-9-]{3,80}$/.test(slug)) return null;

  const event = await unstable_cache(
    async () => {
      const event = await prisma.event.findUnique({ where: { slug } });
      if (!event) return null;
      if (!["published", "sold_out", "live", "closed"].includes(event.status)) {
        return null;
      }
      return withSpots(event, await getEventOccupancy(event.id));
    },
    [`event-slug-v2-${slug}`],
    { revalidate: 20 }
  )();
  return event ? reviveEventDates(event) : null;
}
