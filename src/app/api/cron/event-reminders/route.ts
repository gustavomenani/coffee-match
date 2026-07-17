import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEventReminderEmail } from "@/lib/notify";
import { formatDateTime } from "@/lib/datetime";
import { auditLog } from "@/lib/audit";
import { requireCronAuth } from "@/lib/security/cron-auth";

export const dynamic = "force-dynamic";

/** Bounded so one invocation cannot outgrow the function timeout. */
const BATCH_SIZE = 100;
/** Concurrent sends per wave — enough to be fast, small enough to be polite. */
const WAVE_SIZE = 10;

export const maxDuration = 60;

/**
 * D-1 reminder: e-mails every paid ticket of events starting in the next 24h
 * that has not been reminded yet (Ticket.reminderSentAt). Meant to be called
 * by an external scheduler with `Authorization: Bearer ${CRON_SECRET}`.
 *
 * MUST run hourly (see vercel.json). The window is a rolling 24h of absolute
 * instants, so it is timezone-proof — but the copy says "É amanhã!". Hourly,
 * a 20:00 event first matches at ~20:00 the previous day and the subject is
 * true. On a daily morning schedule the same event would only match on the
 * morning OF the event, and every reminder would lie.
 *
 * reminderSentAt makes re-runs idempotent, so an hourly cadence costs nothing.
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
    take: BATCH_SIZE,
  });

  let reminded = 0;
  let failed = 0;

  // Mark ONLY what actually went out. sendEventReminderEmail resolves whether
  // or not Resend accepted the message, so marking unconditionally (as this
  // did) meant one provider outage silently burned the reminder for every
  // ticket in the batch — reminderSentAt is filtered on above, so the next run
  // skips them and nobody is ever reminded.
  for (let i = 0; i < tickets.length; i += WAVE_SIZE) {
    const wave = tickets.slice(i, i + WAVE_SIZE);
    const settled = await Promise.allSettled(
      wave.map((ticket) =>
        sendEventReminderEmail({
          to: ticket.user.email,
          eventTitle: ticket.event.title,
          eventWhen: formatDateTime(ticket.event.startsAt),
          venue: `${ticket.event.venue}, ${ticket.event.city}`,
          ticketId: ticket.id,
        })
      )
    );

    const deliveredIds: string[] = [];
    settled.forEach((result, idx) => {
      if (result.status === "fulfilled" && result.value) {
        deliveredIds.push(wave[idx].id);
      }
    });
    failed += wave.length - deliveredIds.length;

    if (deliveredIds.length > 0) {
      await prisma.ticket.updateMany({
        where: { id: { in: deliveredIds } },
        data: { reminderSentAt: new Date() },
      });
      reminded += deliveredIds.length;
    }
  }

  await auditLog({
    action: "cron.event_reminders",
    meta: { reminded, failed, batchFull: tickets.length === BATCH_SIZE },
  });

  return NextResponse.json({ reminded, failed });
}
