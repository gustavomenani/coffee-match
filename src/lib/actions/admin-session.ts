"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { computeMutualMatches } from "@/lib/domain/matching";
import { requireAdmin } from "@/lib/authz";
import { auditLog } from "@/lib/audit";
import { parseCuid } from "@/lib/security/ids";
import { sendMatchesReadyEmail } from "@/lib/notify";
import { sendPushToUsers } from "@/lib/push";
import type { ActionResult } from "@/lib/action-result";
import type { CheckInTicketRow } from "@/components/admin/checkin-list";

/** Concurrent e-mails per wave when notifying a whole room. */
const NOTIFY_WAVE_SIZE = 10;

export type ListCheckInsResult =
  | { ok: true; tickets: CheckInTicketRow[] }
  | { ok: false; error: string };

/**
 * Current paid-ticket rows for an event (live check-in polling).
 * Mirrors the query the noite page uses to build CheckInTicketRow.
 */
export async function listCheckIns(
  rawEventId: string
): Promise<ListCheckInsResult> {
  const eventId = parseCuid(rawEventId);
  if (!eventId) return { ok: false, error: "Evento inválido." };

  const admin = await requireAdmin();
  if (!admin.ok) return admin;

  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      organizationId: admin.membership.organizationId,
    },
    select: { id: true },
  });
  if (!event) {
    return { ok: false, error: "Evento não encontrado." };
  }

  const tickets = await prisma.ticket.findMany({
    where: { eventId, status: "paid" },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          gender: true,
          phone: true,
        },
      },
    },
    orderBy: { user: { name: "asc" } },
  });

  return {
    ok: true,
    tickets: tickets.map((t) => ({
      id: t.id,
      checkedInAt: t.checkedInAt ? t.checkedInAt.toISOString() : null,
      user: {
        name: t.user.name,
        email: t.user.email,
        gender: t.user.gender,
        phone: t.user.phone,
      },
    })),
  };
}

export async function checkInTicket(
  rawEventId: string,
  rawTicketId: string
): Promise<ActionResult> {
  const eventId = parseCuid(rawEventId);
  const ticketId = parseCuid(rawTicketId);
  if (!eventId || !ticketId) return { ok: false, error: "Ingresso inválido." };

  const admin = await requireAdmin();
  if (!admin.ok) return admin;

  // Scoped to the event, not just the organization — its checkInByTicketId
  // sibling already was. Without eventId, an admin running tonight's door could
  // check in a ticket for a DIFFERENT night of the same org, and that check-in
  // then satisfies castVote's presence test for that other event: someone who
  // was never in the room appears on its ballot and can match.
  const ticket = await prisma.ticket.findFirst({
    where: {
      id: ticketId,
      eventId,
      status: "paid",
      event: { organizationId: admin.membership.organizationId },
    },
  });
  if (!ticket) {
    return { ok: false, error: "Ingresso pago não encontrado." };
  }

  if (ticket.checkedInAt) {
    return { ok: true };
  }

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { checkedInAt: new Date() },
  });

  await auditLog({
    actorId: admin.user.id,
    action: "ticket.check_in",
    meta: { ticketId, eventId: ticket.eventId },
  });

  revalidatePath(`/admin/eventos/${ticket.eventId}/noite`);
  return { ok: true };
}

export async function checkInByTicketId(
  rawEventId: string,
  rawTicketId: string
): Promise<ActionResult> {
  const eventId = parseCuid(rawEventId);
  const id = parseCuid(rawTicketId.trim());
  if (!eventId || !id) {
    return { ok: false, error: "Código de ingresso inválido." };
  }

  const admin = await requireAdmin();
  if (!admin.ok) return admin;

  const ticket = await prisma.ticket.findFirst({
    where: {
      id,
      eventId,
      status: "paid",
      event: { organizationId: admin.membership.organizationId },
    },
  });
  if (!ticket) {
    return {
      ok: false,
      error: "Ingresso pago não encontrado para este evento.",
    };
  }

  if (ticket.checkedInAt) {
    return { ok: true };
  }

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: { checkedInAt: new Date() },
  });

  await auditLog({
    actorId: admin.user.id,
    action: "ticket.check_in",
    meta: { ticketId: id, eventId, via: "code" },
  });

  revalidatePath(`/admin/eventos/${eventId}/noite`);
  return { ok: true };
}

export async function openVoting(rawEventId: string): Promise<ActionResult> {
  const eventId = parseCuid(rawEventId);
  if (!eventId) return { ok: false, error: "Evento inválido." };

  const admin = await requireAdmin();
  if (!admin.ok) return admin;

  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      organizationId: admin.membership.organizationId,
    },
  });
  if (!event) {
    return { ok: false, error: "Evento não encontrado." };
  }

  await prisma.$transaction([
    prisma.eventSession.upsert({
      where: { eventId },
      create: {
        eventId,
        status: "voting_open",
        votingOpensAt: new Date(),
      },
      update: {
        status: "voting_open",
        votingOpensAt: new Date(),
        votingClosesAt: null,
      },
    }),
    prisma.event.update({
      where: { id: eventId },
      data: { status: "live" },
    }),
  ]);

  await auditLog({
    actorId: admin.user.id,
    action: "voting.open",
    meta: { eventId },
  });

  revalidatePath(`/admin/eventos/${eventId}/noite`);
  revalidatePath(`/evento/${eventId}/votar`);
  return { ok: true };
}

export async function closeVoting(rawEventId: string): Promise<ActionResult> {
  const eventId = parseCuid(rawEventId);
  if (!eventId) return { ok: false, error: "Evento inválido." };

  const admin = await requireAdmin();
  if (!admin.ok) return admin;

  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      organizationId: admin.membership.organizationId,
    },
  });
  if (!event) {
    return { ok: false, error: "Evento não encontrado." };
  }

  const session = await prisma.eventSession.findUnique({ where: { eventId } });
  if (!session) {
    return { ok: false, error: "Sessão do evento não encontrada." };
  }
  if (session.status !== "voting_open") {
    return { ok: false, error: "A votação não está aberta." };
  }

  // Claiming the session is the FIRST write, and every read that feeds the
  // matching happens AFTER it, inside the same transaction. Both orderings
  // matter:
  //
  //  - Claim before the writes: a double click (or two admins, or a retry)
  //    cannot both proceed. The status check above is only a fast path — it
  //    reads outside the transaction, and an unguarded update let a second run
  //    delete the first run's matches, recreate them with new ids, and e-mail
  //    every voter again.
  //  - Read after the claim: while the session is still voting_open, castVote
  //    keeps accepting votes. Anything read before the claim is a snapshot that
  //    can grow under us, and a vote landing in that window would be dropped
  //    from BOTH the matching and the notification list — two people who each
  //    said yes get no match and no e-mail, with no trace. Once the claim
  //    commits the session is closed, so the vote set can no longer change.
  const closed = await prisma.$transaction(async (tx) => {
    const claim = await tx.eventSession.updateMany({
      where: { id: session.id, status: "voting_open" },
      data: { status: "voting_closed", votingClosesAt: new Date() },
    });
    if (claim.count === 0) return null;

    // Only people actually in the room may match. A ticket refunded between the
    // vote and the close still had its votes counted, so the refunded person
    // matched anyway — and their counterpart got their name, phone and WhatsApp
    // link, while they themselves were locked out of the results.
    const presentTickets = await tx.ticket.findMany({
      where: { eventId, status: "paid", checkedInAt: { not: null } },
      select: { userId: true },
    });
    const presentUserIds = presentTickets.map((t) => t.userId);

    const votes = await tx.vote.findMany({
      where: {
        sessionId: session.id,
        fromUserId: { in: presentUserIds },
        toUserId: { in: presentUserIds },
      },
    });
    const pairs = computeMutualMatches(
      votes.map((v) => ({
        fromUserId: v.fromUserId,
        toUserId: v.toUserId,
        interest: v.interest,
      }))
    );

    await tx.match.deleteMany({ where: { sessionId: session.id } });
    if (pairs.length > 0) {
      await tx.match.createMany({
        data: pairs.map((p) => ({
          sessionId: session.id,
          userAId: p.userAId,
          userBId: p.userBId,
        })),
      });
    }
    await tx.event.update({
      where: { id: eventId },
      data: { status: "closed" },
    });
    return { pairs, voterIds: [...new Set(votes.map((v) => v.fromUserId))] };
  });

  if (!closed) {
    return { ok: false, error: "A votação não está aberta." };
  }
  const { pairs, voterIds } = closed;

  await auditLog({
    actorId: admin.user.id,
    action: "voting.close",
    meta: { eventId, matchCount: pairs.length },
  });

  // Notify everyone who voted that results are out (matches count per user).
  const matchCountByUser = new Map<string, number>();
  for (const p of pairs) {
    matchCountByUser.set(p.userAId, (matchCountByUser.get(p.userAId) ?? 0) + 1);
    matchCountByUser.set(p.userBId, (matchCountByUser.get(p.userBId) ?? 0) + 1);
  }
  if (voterIds.length > 0) {
    const voters = await prisma.user.findMany({
      where: { id: { in: voterIds } },
      select: { id: true, email: true },
    });

    // This is the payoff moment of the night and it runs after the transaction
    // committed, with the whole room refreshing their phones. Awaiting an email
    // round trip plus a push lookup per voter, one at a time, took ~40s with a
    // full room — past the function timeout, which killed the loop partway: an
    // arbitrary subset notified, no way to tell who, and no way to re-run
    // (the session is closed now, so closeVoting refuses).
    //
    // Push goes out in a single query for the whole room; e-mails go in waves.
    const pushPayloads = (userId: string) => {
      const matchCount = matchCountByUser.get(userId) ?? 0;
      return {
        title: "Seus resultados saíram ☕",
        body:
          matchCount > 0
            ? `Você tem ${matchCount} match${matchCount > 1 ? "es" : ""}! Veja quem também disse sim.`
            : "A votação encerrou — veja os resultados.",
        url: `/evento/${eventId}/matches`,
      };
    };

    // Waves run one after another so we never open 100 sockets at once.
    for (let i = 0; i < voters.length; i += NOTIFY_WAVE_SIZE) {
      const wave = voters.slice(i, i + NOTIFY_WAVE_SIZE);
      await Promise.allSettled(
        wave.map((voter) =>
          sendMatchesReadyEmail({
            to: voter.email,
            eventTitle: event.title,
            eventId,
            matchCount: matchCountByUser.get(voter.id) ?? 0,
          })
        )
      );
    }

    await sendPushToUsers(voterIds, pushPayloads);
  }

  revalidatePath(`/admin/eventos/${eventId}/noite`);
  revalidatePath(`/evento/${eventId}/votar`);
  revalidatePath(`/evento/${eventId}/matches`);
  return { ok: true };
}

export async function reopenVoting(rawEventId: string): Promise<ActionResult> {
  const eventId = parseCuid(rawEventId);
  if (!eventId) return { ok: false, error: "Evento inválido." };

  const admin = await requireAdmin();
  if (!admin.ok) return admin;

  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      organizationId: admin.membership.organizationId,
    },
  });
  if (!event) {
    return { ok: false, error: "Evento não encontrado." };
  }

  const session = await prisma.eventSession.findUnique({ where: { eventId } });
  if (!session) {
    return { ok: false, error: "Sessão do evento não encontrada." };
  }
  if (session.status !== "voting_closed") {
    return { ok: false, error: "A votação não está encerrada." };
  }

  // Matches are kept on purpose: closeVoting recalculates from scratch
  // (deleteMany + createMany) whenever the voting is closed again.
  await prisma.$transaction([
    prisma.eventSession.update({
      where: { id: session.id },
      data: { status: "voting_open", votingClosesAt: null },
    }),
    prisma.event.update({
      where: { id: eventId },
      data: { status: "live" },
    }),
  ]);

  await auditLog({
    actorId: admin.user.id,
    action: "voting.reopen",
    meta: { eventId },
  });

  revalidatePath(`/admin/eventos/${eventId}/noite`);
  revalidatePath(`/evento/${eventId}/votar`);
  revalidatePath(`/evento/${eventId}/matches`);
  return { ok: true };
}
