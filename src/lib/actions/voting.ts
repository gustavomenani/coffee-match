"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canVote, oppositeGender } from "@/lib/domain/eligibility";

export type ActionResult = { ok: true } | { ok: false; error: string };

export type BallotCandidate = {
  id: string;
  name: string;
  photoUrl: string | null;
};

export type BallotVote = {
  toUserId: string;
  interest: "yes" | "no";
};

export type BallotData = {
  candidates: BallotCandidate[];
  votes: BallotVote[];
  eventTitle: string;
};

export type BallotResult =
  | { ok: true; data: BallotData }
  | { ok: false; error: string; code?: "auth" | "ticket" | "checkin" | "session" | "phone" };

export async function castVote(input: {
  eventId: string;
  toUserId: string;
  interest: "yes" | "no";
}): Promise<ActionResult> {
  const { parseCuid } = await import("@/lib/security/ids");
  const eventId = parseCuid(input.eventId);
  const toUserId = parseCuid(input.toUserId);
  if (!eventId || !toUserId) {
    return { ok: false, error: "Dados inválidos." };
  }
  if (input.interest !== "yes" && input.interest !== "no") {
    return { ok: false, error: "Voto inválido." };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Não autenticado." };
  }

  if (session.user.id === toUserId) {
    return { ok: false, error: "Voto inválido." };
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return { ok: false, error: "Não autenticado." };
  }

  const ticket = await prisma.ticket.findFirst({
    where: { eventId, userId: user.id, status: "paid" },
  });
  const eventSession = await prisma.eventSession.findUnique({
    where: { eventId },
  });

  if (
    !ticket ||
    !eventSession ||
    !canVote({
      ticketStatus: ticket.status,
      checkedIn: !!ticket.checkedInAt,
      sessionStatus: eventSession.status,
      hasWhatsapp: !!user.phone?.trim(),
    })
  ) {
    return { ok: false, error: "Você não pode votar agora." };
  }

  const target = await prisma.user.findUnique({ where: { id: toUserId } });
  if (!target || target.gender !== oppositeGender(user.gender)) {
    return { ok: false, error: "Voto inválido." };
  }

  const targetTicket = await prisma.ticket.findFirst({
    where: {
      eventId,
      userId: target.id,
      status: "paid",
      checkedInAt: { not: null },
    },
  });
  if (!targetTicket) {
    return { ok: false, error: "Pessoa não está no evento." };
  }

  await prisma.vote.upsert({
    where: {
      sessionId_fromUserId_toUserId: {
        sessionId: eventSession.id,
        fromUserId: user.id,
        toUserId: target.id,
      },
    },
    create: {
      sessionId: eventSession.id,
      fromUserId: user.id,
      toUserId: target.id,
      interest: input.interest,
    },
    update: { interest: input.interest },
  });

  revalidatePath(`/evento/${eventId}/votar`);
  return { ok: true };
}

export async function getBallot(rawEventId: string): Promise<BallotResult> {
  const { parseCuid } = await import("@/lib/security/ids");
  const eventId = parseCuid(rawEventId);
  if (!eventId) {
    return { ok: false, error: "Evento não encontrado." };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Faça login para votar.", code: "auth" };
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return { ok: false, error: "Faça login para votar.", code: "auth" };
  }

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    return { ok: false, error: "Evento não encontrado." };
  }

  const ticket = await prisma.ticket.findFirst({
    where: { eventId, userId: user.id, status: "paid" },
  });
  if (!ticket) {
    return {
      ok: false,
      error: "Você precisa de um ingresso pago para este evento.",
      code: "ticket",
    };
  }
  if (!ticket.checkedInAt) {
    return {
      ok: false,
      error: "Faça o check-in no evento para poder votar.",
      code: "checkin",
    };
  }

  if (!user.phone?.trim()) {
    return {
      ok: false,
      error: "Preencha seu WhatsApp em Minha conta antes de votar.",
      code: "phone",
    };
  }

  const eventSession = await prisma.eventSession.findUnique({
    where: { eventId },
  });
  if (!eventSession || eventSession.status !== "voting_open") {
    const msg =
      eventSession?.status === "voting_closed"
        ? "A votação deste evento já foi encerrada."
        : "A votação ainda não foi aberta.";
    return { ok: false, error: msg, code: "session" };
  }

  const targetGender = oppositeGender(user.gender);
  const tickets = await prisma.ticket.findMany({
    where: {
      eventId,
      status: "paid",
      checkedInAt: { not: null },
      user: { gender: targetGender },
    },
    include: {
      user: { select: { id: true, name: true, photoUrl: true } },
    },
    orderBy: { user: { name: "asc" } },
  });

  const existingVotes = await prisma.vote.findMany({
    where: {
      sessionId: eventSession.id,
      fromUserId: user.id,
    },
    select: { toUserId: true, interest: true },
  });

  return {
    ok: true,
    data: {
      eventTitle: event.title,
      candidates: tickets.map((t) => ({
        id: t.user.id,
        name: t.user.name,
        photoUrl: t.user.photoUrl,
      })),
      votes: existingVotes.map((v) => ({
        toUserId: v.toUserId,
        interest: v.interest,
      })),
    },
  };
}
