"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeMutualMatches } from "@/lib/domain/matching";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Não autenticado.");
  }
  if (session.user.role !== "admin") {
    throw new Error("Acesso negado.");
  }
  return session;
}

export async function checkInTicket(ticketId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Acesso negado." };
  }

  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, status: "paid" },
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

  revalidatePath(`/admin/eventos/${ticket.eventId}/noite`);
  return { ok: true };
}

export async function checkInByTicketId(
  eventId: string,
  ticketId: string,
): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Acesso negado." };
  }

  const id = ticketId.trim();
  if (!id) {
    return { ok: false, error: "Informe o código do ingresso." };
  }

  const ticket = await prisma.ticket.findFirst({
    where: { id, eventId, status: "paid" },
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

  revalidatePath(`/admin/eventos/${eventId}/noite`);
  return { ok: true };
}

export async function openVoting(eventId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Acesso negado." };
  }

  const event = await prisma.event.findUnique({ where: { id: eventId } });
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

  revalidatePath(`/admin/eventos/${eventId}/noite`);
  revalidatePath(`/evento/${eventId}/votar`);
  return { ok: true };
}

export async function closeVoting(eventId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Acesso negado." };
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
    })),
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

  revalidatePath(`/admin/eventos/${eventId}/noite`);
  revalidatePath(`/evento/${eventId}/votar`);
  return { ok: true };
}
