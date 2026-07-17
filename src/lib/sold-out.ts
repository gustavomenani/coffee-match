import { prisma } from "@/lib/prisma";
import { shouldMarkSoldOut } from "@/lib/domain/capacity";
import { getEventOccupancy } from "@/lib/occupancy";
import { bustEventCaches } from "@/lib/cache-bust";
import { sendSpotOpenedEmail } from "@/lib/notify";
import { isPushConfigured, sendPushToUser } from "@/lib/push";
import { auditLog } from "@/lib/audit";
import { logError } from "@/lib/observability";

/**
 * Keeps Event.status in sync with real occupancy.
 *
 * Deliberately NOT in a "use server" module. Every export of one is a callable
 * HTTP endpoint, and this used to live in src/lib/actions/tickets.ts — an
 * internal helper with no auth and no rate limit, reachable by anyone with the
 * action id, taking an arbitrary eventId and triggering DB writes plus a
 * 50-recipient e-mail blast. It is called from the payment webhook, checkout,
 * refunds and a cron; none of those need it to be an action.
 */

/**
 * Bounded per transition: this runs inside the Mercado Pago webhook, which must
 * answer before MP times out and retries. `batchFull` in the audit meta flags
 * when a waitlist outgrew one pass.
 */
const WAITLIST_BATCH = 50;

/** Mark published → sold_out when both genders are full; reverse when capacity frees. */
export async function syncEventSoldOutStatus(eventId: string): Promise<void> {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return;
  if (event.status !== "published" && event.status !== "sold_out") return;

  const occ = await getEventOccupancy(eventId);
  const fullySoldOut = shouldMarkSoldOut(event, occ);

  // Both transitions are claimed with a guarded updateMany rather than a bare
  // update on the id. This is a read-decide-write and it has 12 call sites: two
  // MP webhook deliveries for one sold-out event, or a webhook racing the
  // expire-pending cron, both read "sold_out", both write "published", and both
  // go on to notify. Since notifyWaitlistSpotOpened only stamps notifiedAt
  // after its sends, both runs pick the same 50 rows and e-mail them twice.
  // Claiming the transition means exactly one run proceeds.
  if (fullySoldOut && event.status === "published") {
    const claimed = await prisma.event.updateMany({
      where: { id: eventId, status: "published" },
      data: { status: "sold_out" },
    });
    if (claimed.count > 0) bustEventCaches(event.slug);
  } else if (!fullySoldOut && event.status === "sold_out") {
    const claimed = await prisma.event.updateMany({
      where: { id: eventId, status: "sold_out" },
      data: { status: "published" },
    });
    if (claimed.count === 0) return; // another run already reopened and notified
    bustEventCaches(event.slug);
    await notifyWaitlistSpotOpened(event);
  }
}

/** Notify up to WAITLIST_BATCH not-yet-notified interested people that a spot opened. */
async function notifyWaitlistSpotOpened(event: {
  id: string;
  title: string;
  slug: string;
  city: string;
}): Promise<void> {
  const candidates = await prisma.eventInterest.findMany({
    where: { eventId: event.id, notifiedAt: null },
    take: WAITLIST_BATCH,
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true },
  });
  if (candidates.length === 0) return;

  // Claim BEFORE sending. The sold_out->published transition claim guarantees one
  // run PER transition, but the room can flap sold_out->published->sold_out while
  // this batch is mid-send (seconds), and the next transition would re-select the
  // SAME still-null rows and e-mail them twice — select->stamp spans the whole
  // send window. updateManyAndReturn flips notifiedAt null->now atomically and
  // returns exactly the rows THIS run won, so a concurrent transition claims a
  // disjoint set. Failed sends are reset to null below, preserving the "only mark
  // what actually went out" rule (Resend down must not retire people forever).
  const claimed = await prisma.eventInterest.updateManyAndReturn({
    where: { id: { in: candidates.map((c) => c.id) }, notifiedAt: null },
    data: { notifiedAt: new Date() },
    select: { id: true, email: true },
  });
  if (claimed.length === 0) return;

  const settled = await Promise.allSettled(
    claimed.map((interest) =>
      sendSpotOpenedEmail({
        to: interest.email,
        eventTitle: event.title,
        eventSlug: event.slug,
        city: event.city,
      })
    )
  );

  const notifiedEmails: string[] = [];
  const failedIds: string[] = [];
  settled.forEach((result, idx) => {
    if (result.status === "fulfilled" && result.value) {
      notifiedEmails.push(claimed[idx].email);
    } else {
      failedIds.push(claimed[idx].id);
      if (result.status === "rejected") {
        logError("waitlist.email_threw", result.reason, {
          interestId: claimed[idx].id,
        });
      }
    }
  });

  // Release the claim on anything that did not go out, so a later transition
  // retries it instead of it being silently retired from the waitlist.
  if (failedIds.length > 0) {
    await prisma.eventInterest.updateMany({
      where: { id: { in: failedIds } },
      data: { notifiedAt: null },
    });
  }

  // O waitlist é por e-mail (pode não ter conta): envia push só para os
  // e-mails que correspondem a usuários cadastrados, além do e-mail.
  if (isPushConfigured() && notifiedEmails.length > 0) {
    const users = await prisma.user.findMany({
      where: { email: { in: [...new Set(notifiedEmails)] } },
      select: { id: true },
    });
    await Promise.allSettled(
      users.map((user) =>
        sendPushToUser(user.id, {
          title: "Abriu vaga! ☕",
          body: `Uma vaga acabou de abrir em "${event.title}" (${event.city}). Garanta a sua!`,
          url: `/eventos/${event.slug}`,
        })
      )
    );
  }

  await auditLog({
    action: "event.waitlist_notified",
    meta: {
      eventId: event.id,
      slug: event.slug,
      notified: notifiedEmails.length,
      failed: failedIds.length,
      batchFull: candidates.length === WAITLIST_BATCH,
    },
  });
}
