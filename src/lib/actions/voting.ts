"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ageFrom } from "@/lib/domain/age";
import { canVote, oppositeGender } from "@/lib/domain/eligibility";
import { rateLimit } from "@/lib/rate-limit";
import { parseCuid } from "@/lib/security/ids";
import type { ActionResult } from "@/lib/action-result";

export type BallotCandidate = {
  id: string;
  name: string;
  photoUrl: string | null;
  age: number;
  bio: string | null;
  supporter: boolean;
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

  if (!(await rateLimit(`vote:${session.user.id}`, 60, 60_000))) {
    return { ok: false, error: "Muitos votos seguidos. Aguarde um momento." };
  }

  const [user, ticket, eventSession, target, targetTicket] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id } }),
    prisma.ticket.findFirst({
      where: { eventId, userId: session.user.id, status: "paid" },
    }),
    prisma.eventSession.findUnique({ where: { eventId } }),
    prisma.user.findUnique({ where: { id: toUserId } }),
    prisma.ticket.findFirst({
      where: {
        eventId,
        userId: toUserId,
        status: "paid",
        checkedInAt: { not: null },
      },
    }),
  ]);

  if (!user) {
    return { ok: false, error: "Não autenticado." };
  }

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

  if (!target || target.gender !== oppositeGender(user.gender)) {
    return { ok: false, error: "Voto inválido." };
  }

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
  const eventId = parseCuid(rawEventId);
  if (!eventId) {
    return { ok: false, error: "Evento não encontrado." };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Faça login para votar.", code: "auth" };
  }

  const [user, event, ticket, eventSession] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id } }),
    prisma.event.findUnique({ where: { id: eventId } }),
    prisma.ticket.findFirst({
      where: { eventId, userId: session.user.id, status: "paid" },
    }),
    prisma.eventSession.findUnique({ where: { eventId } }),
  ]);

  if (!user) {
    return { ok: false, error: "Faça login para votar.", code: "auth" };
  }

  if (!event) {
    return { ok: false, error: "Evento não encontrado." };
  }

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

  if (!eventSession || eventSession.status !== "voting_open") {
    const msg =
      eventSession?.status === "voting_closed"
        ? "A votação deste evento já foi encerrada."
        : "A votação ainda não foi aberta.";
    return { ok: false, error: msg, code: "session" };
  }

  const targetGender = oppositeGender(user.gender);
  const [tickets, existingVotes] = await Promise.all([
    prisma.ticket.findMany({
      where: {
        eventId,
        status: "paid",
        checkedInAt: { not: null },
        user: { gender: targetGender },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
            birthDate: true,
            bio: true,
            subscription: { select: { status: true } },
          },
        },
      },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.vote.findMany({
      where: {
        sessionId: eventSession.id,
        fromUserId: user.id,
      },
      select: { toUserId: true, interest: true },
    }),
  ]);

  return {
    ok: true,
    data: {
      eventTitle: event.title,
      candidates: tickets.map((t) => ({
        id: t.user.id,
        name: t.user.name,
        photoUrl: t.user.photoUrl,
        age: ageFrom(t.user.birthDate),
        bio: t.user.bio,
        supporter: t.user.subscription?.status === "active",
      })),
      votes: existingVotes.map((v) => ({
        toUserId: v.toUserId,
        interest: v.interest,
      })),
    },
  };
}
