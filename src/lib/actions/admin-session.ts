"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { computeMutualMatches } from "@/lib/domain/matching";
import { requireAdmin } from "@/lib/authz";
import { auditLog } from "@/lib/audit";
import { parseCuid } from "@/lib/security/ids";
import { sendMatchesReadyEmail } from "@/lib/notify";
import type { ActionResult } from "@/lib/action-result";
import type { CheckInTicketRow } from "@/components/admin/checkin-list";

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

export async function checkInTicket(rawTicketId: string): Promise<ActionResult> {
  const ticketId = parseCuid(rawTicketId);
  if (!ticketId) return { ok: false, error: "Ingresso inválido." };

  const admin = await requireAdmin();
  if (!admin.ok) return admin;

  const ticket = await prisma.ticket.findFirst({
    where: {
      id: ticketId,
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

  const votes = await prisma.vote.findMany({ where: { sessionId: session.id } });
  const pairs = computeMutualMatches(
    votes.map((v) => ({
      fromUserId: v.fromUserId,
      toUserId: v.toUserId,
      interest: v.interest,
    }))
  );

  await prisma.$transaction(async (tx) => {
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
    await tx.eventSession.update({
      where: { id: session.id },
      data: { status: "voting_closed", votingClosesAt: new Date() },
    });
    await tx.event.update({
      where: { id: eventId },
      data: { status: "closed" },
    });
  });

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
  const voterIds = [...new Set(votes.map((v) => v.fromUserId))];
  if (voterIds.length > 0) {
    const voters = await prisma.user.findMany({
      where: { id: { in: voterIds } },
      select: { id: true, email: true },
    });
    for (const voter of voters) {
      await sendMatchesReadyEmail({
        to: voter.email,
        eventTitle: event.title,
        eventId,
        matchCount: matchCountByUser.get(voter.id) ?? 0,
      });
    }
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
