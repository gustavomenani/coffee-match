import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PENDING_TICKET_TTL_MS } from "@/lib/domain/checkout";
import { syncEventSoldOutStatus } from "@/lib/sold-out";
import { bustEventCaches } from "@/lib/cache-bust";
import { auditLog } from "@/lib/audit";
import { requireCronAuth } from "@/lib/security/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Rows per cancel statement — keeps each update short and lock-friendly. */
const BATCH_SIZE = 5_000;
/** Ceiling per invocation so the function cannot run past its timeout. */
const MAX_BATCHES = 20;

/**
 * Cancels every pending ticket older than PENDING_TICKET_TTL_MS.
 * Meant to be called by an external scheduler with
 * `Authorization: Bearer ${CRON_SECRET}` (see .env.example).
 *
 * Two properties this route must have, both learned from the sibling
 * cleanup-audit cron:
 *
 *   1. BATCHED CANCEL. A single unbounded updateMany is one statement: on a
 *      large backlog it can exceed maxDuration, roll back atomically, and make
 *      ZERO progress — failing identically on every run so pending tickets are
 *      never freed. Batching guarantees forward progress even when a run does
 *      not finish (`pending: true` tells the next run there is more to do).
 *
 *   2. RECOVERABLE RECONCILE. Occupancy counts pending+paid, so cancelling a
 *      pending ticket frees a seat and may reopen a sold_out event. Driving that
 *      sync only from "events we cancelled tickets for THIS run" is not
 *      recoverable: if a prior run cancelled the rows but timed out before
 *      syncing, those events keep their freed seats yet stay sold_out — and
 *      because their pending rows are already gone, this run finds nothing to
 *      cancel for them and never revisits them, leaving real capacity
 *      permanently unbuyable (checkout 404s on a non-published event). So the
 *      reconcile set is re-derived every run from every currently sold_out
 *      event, which self-heals a partial prior run. syncEventSoldOutStatus is an
 *      idempotent guarded transition and no-ops on events that are still full.
 */
export async function GET(req: NextRequest) {
  const unauthorized = requireCronAuth(req);
  if (unauthorized) return unauthorized;

  const cutoff = new Date(Date.now() - PENDING_TICKET_TTL_MS);

  // eventId -> slug for events we freed seats on this run (need a cache bust so
  // the public "spots left" display refreshes even when the event stays open).
  const freed = new Map<string, string>();
  let cancelled = 0;
  let batches = 0;

  while (batches < MAX_BATCHES) {
    const stale = await prisma.ticket.findMany({
      where: { status: "pending", createdAt: { lte: cutoff } },
      select: { id: true, event: { select: { id: true, slug: true } } },
      take: BATCH_SIZE,
    });
    if (stale.length === 0) break;

    const { count } = await prisma.ticket.updateMany({
      // Re-assert status in the guard: a row could flip to paid between the read
      // and this write, and we must never cancel a paid ticket.
      where: { id: { in: stale.map((r) => r.id) }, status: "pending" },
      data: { status: "cancelled" },
    });
    cancelled += count;
    for (const r of stale) freed.set(r.event.id, r.event.slug);
    batches += 1;
    if (stale.length < BATCH_SIZE) break;
  }

  // Union of "events we freed this run" and "every currently sold_out event".
  const soldOut = await prisma.event.findMany({
    where: { status: "sold_out" },
    select: { id: true, slug: true },
  });
  const toReconcile = new Map(freed);
  for (const e of soldOut) toReconcile.set(e.id, e.slug);

  for (const [eventId, slug] of toReconcile) {
    await syncEventSoldOutStatus(eventId);
    // Refresh the public capacity display for events we freed seats on but that
    // stayed published (sync only busts on an actual status transition).
    bustEventCaches(slug);
  }

  await auditLog({
    action: "cron.expire_pending",
    meta: {
      cancelled,
      freedEvents: freed.size,
      reconciled: toReconcile.size,
      batches,
    },
  });

  return NextResponse.json({
    cancelled,
    reconciled: toReconcile.size,
    pending: batches >= MAX_BATCHES,
  });
}
