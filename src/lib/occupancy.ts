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

/** Subset of the Prisma client the queries here need (works inside $transaction). */
type QueryClient = Pick<typeof prisma, "$queryRaw">;

/**
 * Occupancy per event aggregated in SQL (GROUP BY), so cost stays constant
 * as ticket volume grows — never load individual ticket rows for counting.
 * Pass a transaction client to read inside an open transaction.
 */
export async function getOccupancyByEvent(
  eventIds: string[],
  client: QueryClient = prisma
): Promise<Map<string, Occupancy>> {
  const result = new Map<string, Occupancy>();
  if (eventIds.length === 0) return result;

  const rows = await client.$queryRaw<CountRow[]>`
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

export async function getEventOccupancy(
  eventId: string,
  client: QueryClient = prisma
): Promise<Occupancy> {
  const map = await getOccupancyByEvent([eventId], client);
  return map.get(eventId) ?? emptyOccupancy();
}
