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

  // Claim BEFORE sending, then release failures — outage-safe AND concurrency-
  // safe at once.
  //
  // The previous version selected reminderSentAt:null and stamped only after a
  // successful send. That is outage-safe (a provider failure leaves the row null
  // so a later run retries) but NOT concurrency-safe: two overlapping runs (a
  // Vercel cron double-fire, or a manual trigger racing the schedule) both
  // select the same null batch and both e-mail it before either stamps.
  //
  // Claiming each wave with a guarded updateManyAndReturn flips null→now
  // atomically and returns EXACTLY the rows this run won, so a concurrent run
  // claims a disjoint set and never double-sends. A row whose send then fails is
  // reset to null, preserving the original retry-on-outage guarantee.
  for (let i = 0; i < tickets.length; i += WAVE_SIZE) {
    const wave = tickets.slice(i, i + WAVE_SIZE);
    const claimed = await prisma.ticket.updateManyAndReturn({
      where: { id: { in: wave.map((t) => t.id) }, reminderSentAt: null },
      data: { reminderSentAt: new Date() },
      select: { id: true },
    });
    const claimedIds = new Set(claimed.map((c) => c.id));
    const toSend = wave.filter((t) => claimedIds.has(t.id));
    if (toSend.length === 0) continue;

    const settled = await Promise.allSettled(
      toSend.map((ticket) =>
        sendEventReminderEmail({
          to: ticket.user.email,
          eventTitle: ticket.event.title,
          eventWhen: formatDateTime(ticket.event.startsAt),
          venue: `${ticket.event.venue}, ${ticket.event.city}`,
          ticketId: ticket.id,
        })
      )
    );

    const failedIds: string[] = [];
    settled.forEach((result, idx) => {
      if (result.status === "fulfilled" && result.value) {
        reminded += 1;
      } else {
        failedIds.push(toSend[idx].id);
      }
    });

    // Release the claim on anything that did not actually go out, so a later run
    // retries it instead of it being silently recorded as reminded.
    if (failedIds.length > 0) {
      await prisma.ticket.updateMany({
        where: { id: { in: failedIds } },
        data: { reminderSentAt: null },
      });
      failed += failedIds.length;
    }
  }

  await auditLog({
    action: "cron.event_reminders",
    meta: { reminded, failed, batchFull: tickets.length === BATCH_SIZE },
  });

  return NextResponse.json({ reminded, failed });
}
