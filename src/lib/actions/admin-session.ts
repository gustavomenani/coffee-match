"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { computeMutualMatches } from "@/lib/domain/matching";
import { requireAdmin } from "@/lib/authz";
import { auditLog } from "@/lib/audit";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function checkInTicket(rawTicketId: string): Promise<ActionResult> {
  const { parseCuid } = await import("@/lib/security/ids");
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
  const { parseCuid } = await import("@/lib/security/ids");
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
  const { parseCuid } = await import("@/lib/security/ids");
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
  const { parseCuid } = await import("@/lib/security/ids");
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

  revalidatePath(`/admin/eventos/${eventId}/noite`);
  revalidatePath(`/evento/${eventId}/votar`);
  revalidatePath(`/evento/${eventId}/matches`);
  return { ok: true };
}
