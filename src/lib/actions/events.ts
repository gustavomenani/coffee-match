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
 * Cached for 30s — keeps list snappy under traffic.
 * Bust with revalidatePath('/eventos') after sales/admin edits.
 */
export async function listPublishedEvents(): Promise<EventWithSpots[]> {
  return unstable_cache(
    fetchPublishedEventsWithSpots,
    ["published-events-with-spots-v2"],
    { revalidate: 30 }
  )();
}

export async function getEventBySlug(
  slug: string
): Promise<EventWithSpots | null> {
  if (!/^[a-z0-9-]{3,80}$/.test(slug)) return null;

  return unstable_cache(
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
}
