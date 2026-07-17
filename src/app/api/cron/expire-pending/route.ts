import { createHash, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PENDING_TICKET_TTL_MS } from "@/lib/domain/checkout";
import { syncEventSoldOutStatus } from "@/lib/actions/tickets";
import { bustEventCaches } from "@/lib/cache-bust";
import { auditLog } from "@/lib/audit";
import { getEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Constant-time comparison that does not leak length differences. */
function secretMatches(provided: string, expected: string): boolean {
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/**
 * Cancels every pending ticket older than PENDING_TICKET_TTL_MS.
 * Meant to be called by an external scheduler with
 * `Authorization: Bearer ${CRON_SECRET}` (see .env.example).
 */
export async function GET(req: NextRequest) {
  const secret = getEnv().CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET não configurado." },
      { status: 503 }
    );
  }

  const authorization = req.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;

  if (!token || !secretMatches(token, secret)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

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
