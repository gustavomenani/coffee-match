import { createHash, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEventReminderEmail } from "@/lib/notify";
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
 * D-1 reminder: e-mails every paid ticket of events starting in the next 24h
 * that has not been reminded yet (Ticket.reminderSentAt). Meant to be called
 * by an external scheduler with `Authorization: Bearer ${CRON_SECRET}`.
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

  const now = new Date();
  const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const tickets = await prisma.ticket.findMany({
    where: {
      status: "paid",
      reminderSentAt: null,
      event: {
        startsAt: { gte: now, lte: windowEnd },
        status: { in: ["published", "sold_out", "live"] },
      },
    },
    include: {
      user: { select: { email: true } },
      event: { select: { title: true, startsAt: true, venue: true, city: true } },
    },
  });

  let reminded = 0;
  for (const ticket of tickets) {
    // Send first, mark after — a throwing send leaves the ticket unmarked
    // so the next run retries it.
    await sendEventReminderEmail({
      to: ticket.user.email,
      eventTitle: ticket.event.title,
      eventWhen: ticket.event.startsAt.toLocaleString("pt-BR"),
      venue: `${ticket.event.venue}, ${ticket.event.city}`,
      ticketId: ticket.id,
    });
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { reminderSentAt: new Date() },
    });
    reminded += 1;
  }

  await auditLog({
    action: "cron.event_reminders",
    meta: { reminded },
  });

  return NextResponse.json({ reminded });
}
