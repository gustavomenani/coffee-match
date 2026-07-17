import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEventReminderEmail } from "@/lib/notify";
import { formatDateTime } from "@/lib/datetime";
import { auditLog } from "@/lib/audit";
import { requireCronAuth } from "@/lib/security/cron-auth";

export const dynamic = "force-dynamic";

/**
 * D-1 reminder: e-mails every paid ticket of events starting in the next 24h
 * that has not been reminded yet (Ticket.reminderSentAt). Meant to be called
 * by an external scheduler with `Authorization: Bearer ${CRON_SECRET}`.
 */
export async function GET(req: NextRequest) {
  const unauthorized = requireCronAuth(req);
  if (unauthorized) return unauthorized;

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
      eventWhen: formatDateTime(ticket.event.startsAt),
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
