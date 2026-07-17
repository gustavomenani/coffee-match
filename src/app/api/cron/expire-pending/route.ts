import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PENDING_TICKET_TTL_MS } from "@/lib/domain/checkout";
import { syncEventSoldOutStatus } from "@/lib/sold-out";
import { bustEventCaches } from "@/lib/cache-bust";
import { auditLog } from "@/lib/audit";
import { requireCronAuth } from "@/lib/security/cron-auth";

export const dynamic = "force-dynamic";

/**
 * Cancels every pending ticket older than PENDING_TICKET_TTL_MS.
 * Meant to be called by an external scheduler with
 * `Authorization: Bearer ${CRON_SECRET}` (see .env.example).
 */
export async function GET(req: NextRequest) {
  const unauthorized = requireCronAuth(req);
  if (unauthorized) return unauthorized;

  const cutoff = new Date(Date.now() - PENDING_TICKET_TTL_MS);
  const where = {
    status: "pending" as const,
    createdAt: { lte: cutoff },
  };

  // Collect affected events before the update so we can sync them afterwards.
  const affectedEvents = await prisma.ticket.findMany({
    where,
    distinct: ["eventId"],
    select: { event: { select: { id: true, slug: true } } },
  });

  const { count } = await prisma.ticket.updateMany({
    where,
    data: { status: "cancelled" },
  });

  for (const { event } of affectedEvents) {
    await syncEventSoldOutStatus(event.id);
    bustEventCaches(event.slug);
  }

  await auditLog({
    action: "cron.expire_pending",
    meta: { cancelled: count, events: affectedEvents.length },
  });

  return NextResponse.json({ cancelled: count });
}
