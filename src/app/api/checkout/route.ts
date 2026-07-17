import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canSellTicket } from "@/lib/domain/capacity";
import {
  isPendingTicketExpired,
  resolveCheckoutTicket,
} from "@/lib/domain/checkout";
import { syncEventSoldOutStatus } from "@/lib/actions/tickets";
import { getEventOccupancy } from "@/lib/occupancy";
import {
  canBuyDuringEarlyAccess,
  inEarlyAccessWindow,
  isSubscriberActive,
} from "@/lib/domain/subscription";
import {
  createTicketPreference,
  isMpDevBypass,
} from "@/lib/mercadopago";
import { rateLimitDetailed } from "@/lib/rate-limit";
import { parseCuid } from "@/lib/security/ids";
import { sendTicketPaidEmail } from "@/lib/notify";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const limit = await rateLimitDetailed(
    `checkout:${session.user.id}`,
    10,
    60_000
  );
  if (!limit.ok) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((limit.resetAt - Date.now()) / 1000)
    );
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde um momento." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSeconds) },
      }
    );
  }

  const body = await req.json().catch(() => null);
  const eventId = parseCuid(body?.eventId);
  if (!eventId) {
    return NextResponse.json({ error: "eventId inválido." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 401 });
  }

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event || event.status !== "published") {
    return NextResponse.json(
      { error: "Evento indisponível para compra." },
      { status: 404 }
    );
  }

  const now = new Date();

  // Subscriber-only early-access window.
  if (inEarlyAccessWindow(event.earlyAccessUntil, now)) {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
    });
    if (!canBuyDuringEarlyAccess(event.earlyAccessUntil, isSubscriberActive(subscription), now)) {
      const until = event.earlyAccessUntil!.toLocaleString("pt-BR");
      return NextResponse.json(
        {
          error: `Venda antecipada exclusiva para assinantes até ${until}. Assine por R$ 10/mês em /assinatura.`,
        },
        { status: 403 }
      );
    }
  }

  // Cancel expired pending tickets for this user+event (>2h) so capacity frees up.
  const userTickets = await prisma.ticket.findMany({
    where: {
      eventId: event.id,
      userId: user.id,
      status: { in: ["pending", "paid"] },
    },
    orderBy: { createdAt: "desc" },
  });

  const expiredPendingIds = userTickets
    .filter(
      (t) => t.status === "pending" && isPendingTicketExpired(t.createdAt, now)
    )
    .map((t) => t.id);

  if (expiredPendingIds.length > 0) {
    await prisma.ticket.updateMany({
      where: { id: { in: expiredPendingIds } },
      data: { status: "cancelled" },
    });
    await syncEventSoldOutStatus(event.id);
  }

  const activeTickets = userTickets.filter(
    (t) => !expiredPendingIds.includes(t.id)
  );
  const decision = resolveCheckoutTicket(activeTickets, now);

  if (decision.action === "reject_paid") {
    return NextResponse.json(
      { error: "Você já possui ingresso para este evento." },
      { status: 409 }
    );
  }

  if (decision.action === "reuse_pending") {
    const existing = activeTickets.find((t) => t.id === decision.ticketId)!;
    if (isMpDevBypass()) {
      await prisma.ticket.update({
        where: { id: existing.id },
        data: { status: "paid" },
      });
      await syncEventSoldOutStatus(event.id);
      await sendTicketPaidEmail({
        to: user.email,
        eventTitle: event.title,
        eventWhen: event.startsAt.toLocaleString("pt-BR"),
        venue: `${event.venue}, ${event.city}`,
        ticketId: existing.id,
      });
      return NextResponse.json({
        initPoint: `/pagamento/sucesso?ticket=${existing.id}`,
      });
    }
    // continue to MP preference for existing pending
    try {
      const preference = await createTicketPreference({
        ticketId: existing.id,
        title: `Ingresso: ${event.title}`,
        priceCents: event.priceCents,
        payerEmail: user.email,
      });
      const initPoint = preference.init_point ?? preference.sandbox_init_point;
      if (!initPoint) {
        return NextResponse.json(
          { error: "Falha ao criar preferência de pagamento." },
          { status: 502 }
        );
      }
      return NextResponse.json({ initPoint });
    } catch {
      return NextResponse.json(
        { error: "Falha ao criar preferência de pagamento." },
        { status: 502 }
      );
    }
  }

  // New ticket: capacity must allow sale for this gender.
  const occupancy = await getEventOccupancy(event.id);
  if (!canSellTicket(event, user.gender, occupancy)) {
    return NextResponse.json(
      { error: "Esgotado para o seu gênero." },
      { status: 409 }
    );
  }

  // Re-check race: another request may have paid meanwhile
  const raced = await prisma.ticket.findFirst({
    where: {
      eventId: event.id,
      userId: user.id,
      status: "paid",
    },
  });
  if (raced) {
    return NextResponse.json(
      { error: "Você já possui ingresso para este evento." },
      { status: 409 }
    );
  }

  let ticket;
  try {
    ticket = await prisma.ticket.create({
      data: {
        eventId: event.id,
        userId: user.id,
        status: "pending",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível criar o ingresso. Tente de novo." },
      { status: 409 }
    );
  }

  await syncEventSoldOutStatus(event.id);

  if (isMpDevBypass()) {
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: "paid" },
    });
    await syncEventSoldOutStatus(event.id);
    await sendTicketPaidEmail({
      to: user.email,
      eventTitle: event.title,
      eventWhen: event.startsAt.toLocaleString("pt-BR"),
      venue: `${event.venue}, ${event.city}`,
      ticketId: ticket.id,
    });
    return NextResponse.json({
      initPoint: `/pagamento/sucesso?ticket=${ticket.id}`,
    });
  }

  try {
    const preference = await createTicketPreference({
      ticketId: ticket.id,
      title: `Ingresso: ${event.title}`,
      priceCents: event.priceCents,
      payerEmail: user.email,
    });
    const initPoint = preference.init_point ?? preference.sandbox_init_point;
    if (!initPoint) {
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { status: "cancelled" },
      });
      await syncEventSoldOutStatus(event.id);
      return NextResponse.json(
        { error: "Falha ao criar preferência de pagamento." },
        { status: 502 }
      );
    }
    return NextResponse.json({ initPoint });
  } catch {
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: "cancelled" },
    });
    await syncEventSoldOutStatus(event.id);
    return NextResponse.json(
      { error: "Falha ao criar preferência de pagamento." },
      { status: 502 }
    );
  }
}
