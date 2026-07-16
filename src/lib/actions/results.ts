"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewResults } from "@/lib/domain/eligibility";
import { requireAdmin } from "@/lib/authz";

export type MatchContact = {
  matchId: string;
  userId: string;
  name: string;
  phone: string;
  instagram: string | null;
  whatsappUrl: string;
};

export type WhoLikedMeEntry = {
  userId: string;
  name: string;
};

export type AdminMatchPair = {
  matchId: string;
  userA: { id: string; name: string; phone: string; gender: string };
  userB: { id: string; name: string; phone: string; gender: string };
};

export type ResultsError = { ok: false; error: string };
export type MyMatchesResult = { ok: true; matches: MatchContact[] } | ResultsError;
export type WhoLikedMeResult =
  | { ok: true; likes: WhoLikedMeEntry[] }
  | ResultsError;
export type AdminMatchesResult =
  | { ok: true; matches: AdminMatchPair[] }
  | ResultsError;

function toWhatsappUrl(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}`;
}

async function loadEligibleTicket(eventId: string, userId: string) {
  const ticket = await prisma.ticket.findFirst({
    where: { eventId, userId },
    include: {
      event: {
        include: { session: true },
      },
    },
  });
  return ticket;
}

export async function getMyMatches(eventId: string): Promise<MyMatchesResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Não autenticado." };

  const ticket = await loadEligibleTicket(eventId, session.user.id);
  if (!ticket) return { ok: false, error: "Ingresso não encontrado." };

  const sessionStatus = ticket.event.session?.status ?? "not_started";
  if (
    !canViewResults({
      ticketStatus: ticket.status,
      checkedIn: !!ticket.checkedInAt,
      sessionStatus,
    })
  ) {
    return {
      ok: false,
      error: "Resultados disponíveis após o fim da votação (ingresso pago e check-in).",
    };
  }

  const eventSession = ticket.event.session;
  if (!eventSession) return { ok: false, error: "Sessão não encontrada." };

  const matches = await prisma.match.findMany({
    where: {
      sessionId: eventSession.id,
      OR: [{ userAId: session.user.id }, { userBId: session.user.id }],
    },
  });

  if (matches.length === 0) return { ok: true, matches: [] };

  const otherIds = matches.map((m) =>
    m.userAId === session.user.id ? m.userBId : m.userAId
  );
  const users = await prisma.user.findMany({
    where: { id: { in: otherIds } },
    select: { id: true, name: true, phone: true, instagram: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));

  const result: MatchContact[] = [];
  for (const m of matches) {
    const otherId = m.userAId === session.user.id ? m.userBId : m.userAId;
    const other = byId.get(otherId);
    if (!other) continue;
    result.push({
      matchId: m.id,
      userId: other.id,
      name: other.name,
      phone: other.phone,
      instagram: other.instagram,
      whatsappUrl: toWhatsappUrl(other.phone),
    });
  }

  return { ok: true, matches: result };
}

export async function getWhoLikedMe(eventId: string): Promise<WhoLikedMeResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Não autenticado." };

  const ticket = await loadEligibleTicket(eventId, session.user.id);
  if (!ticket) return { ok: false, error: "Ingresso não encontrado." };

  const sessionStatus = ticket.event.session?.status ?? "not_started";
  if (
    !canViewResults({
      ticketStatus: ticket.status,
      checkedIn: !!ticket.checkedInAt,
      sessionStatus,
    })
  ) {
    return {
      ok: false,
      error: "Resultados disponíveis após o fim da votação (ingresso pago e check-in).",
    };
  }

  const eventSession = ticket.event.session;
  if (!eventSession) return { ok: false, error: "Sessão não encontrada." };

  const votes = await prisma.vote.findMany({
    where: {
      sessionId: eventSession.id,
      toUserId: session.user.id,
      interest: "yes",
    },
    include: {
      fromUser: { select: { id: true, name: true } },
    },
  });

  return {
    ok: true,
    likes: votes.map((v) => ({
      userId: v.fromUser.id,
      name: v.fromUser.name,
    })),
  };
}

export async function getAdminSessionMatches(
  eventId: string
): Promise<AdminMatchesResult> {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return { ok: false, error: admin.error };
  }

  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      organizationId: admin.membership.organizationId,
    },
    include: { session: true },
  });
  if (!event?.session) return { ok: false, error: "Sessão não encontrada." };
  const eventSession = event.session;

  const matches = await prisma.match.findMany({
    where: { sessionId: eventSession.id },
    orderBy: { createdAt: "asc" },
  });

  if (matches.length === 0) return { ok: true, matches: [] };

  const userIds = Array.from(
    new Set(matches.flatMap((m) => [m.userAId, m.userBId]))
  );
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, phone: true, gender: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));

  const result: AdminMatchPair[] = [];
  for (const m of matches) {
    const userA = byId.get(m.userAId);
    const userB = byId.get(m.userBId);
    if (!userA || !userB) continue;
    result.push({ matchId: m.id, userA, userB });
  }

  return { ok: true, matches: result };
}
