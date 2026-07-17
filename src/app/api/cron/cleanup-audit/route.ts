import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCronAuth } from "@/lib/security/cron-auth";

export const dynamic = "force-dynamic";

const RETENTION_MS = 90 * 24 * 60 * 60 * 1000; // 90 dias

/** Rows per statement — keeps each delete short and lock-friendly. */
const BATCH_SIZE = 5_000;
/** Ceiling per invocation so the function cannot run past its timeout. */
const MAX_BATCHES = 20;

export const maxDuration = 60;

/**
 * Deletes audit log entries older than 90 days (LGPD-friendly retention).
 * Scheduled daily by vercel.json; sends `Authorization: Bearer ${CRON_SECRET}`.
 *
 * Deletes in batches. A single unbounded deleteMany is one statement: if the
 * table ever grows big enough for it to exceed the function timeout, it aborts,
 * rolls back atomically, and makes NO progress — so it would fail identically
 * on every run and retention would silently stop working, which is exactly the
 * scenario this is here to prevent. Batching means each run makes progress even
 * if it does not finish.
 */
export async function GET(req: NextRequest) {
  const unauthorized = requireCronAuth(req);
  if (unauthorized) return unauthorized;

  const cutoff = new Date(Date.now() - RETENTION_MS);
  let deleted = 0;
  let batches = 0;

  while (batches < MAX_BATCHES) {
    const stale = await prisma.auditLog.findMany({
      where: { createdAt: { lt: cutoff } },
      select: { id: true },
      take: BATCH_SIZE,
    });
    if (stale.length === 0) break;

    const { count } = await prisma.auditLog.deleteMany({
      where: { id: { in: stale.map((row) => row.id) } },
    });
    deleted += count;
    batches += 1;
    if (stale.length < BATCH_SIZE) break;
  }

  // `pending` tells the next run there is more to do.
  return NextResponse.json({ deleted, pending: batches >= MAX_BATCHES });
}
