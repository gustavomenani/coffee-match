import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  emptyOccupancy,
  occupancyFromCounts,
  type Occupancy,
} from "@/lib/domain/capacity";

type CountRow = {
  eventId: string;
  status: string;
  gender: string;
  count: bigint;
};

/**
 * Occupancy per event aggregated in SQL (GROUP BY), so cost stays constant
 * as ticket volume grows — never load individual ticket rows for counting.
 */
export async function getOccupancyByEvent(
  eventIds: string[]
): Promise<Map<string, Occupancy>> {
  const result = new Map<string, Occupancy>();
  if (eventIds.length === 0) return result;

  const rows = await prisma.$queryRaw<CountRow[]>`
    SELECT t."eventId",
           t."status"::text AS "status",
           u."gender"::text AS "gender",
           COUNT(*) AS "count"
    FROM "Ticket" t
    JOIN "User" u ON u."id" = t."userId"
    WHERE t."eventId" IN (${Prisma.join(eventIds)})
      AND t."status" IN ('pending', 'paid')
    GROUP BY t."eventId", t."status", u."gender"
  `;

  const byEvent = new Map<string, CountRow[]>();
  for (const row of rows) {
    const list = byEvent.get(row.eventId) ?? [];
    list.push(row);
    byEvent.set(row.eventId, list);
  }

  for (const id of eventIds) {
    const eventRows = byEvent.get(id);
    result.set(
      id,
      eventRows
        ? occupancyFromCounts(
            eventRows.map((r) => ({
              status: r.status,
              gender: r.gender,
              count: Number(r.count),
            }))
          )
        : emptyOccupancy()
    );
  }

  return result;
}

export async function getEventOccupancy(eventId: string): Promise<Occupancy> {
  const map = await getOccupancyByEvent([eventId]);
  return map.get(eventId) ?? emptyOccupancy();
}
