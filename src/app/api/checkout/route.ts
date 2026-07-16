import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canSellTicket } from "@/lib/domain/capacity";
import { getEventOccupancy } from "@/lib/actions/tickets";
import {
  createTicketPreference,
  isMpDevBypass,
} from "@/lib/mercadopago";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const eventId = body?.eventId as string | undefined;
  if (!eventId || typeof eventId !== "string") {
    return NextResponse.json({ error: "eventId obrigatório." }, { status: 400 });
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

  const occupancy = await getEventOccupancy(event.id);
  if (!canSellTicket(event, user.gender, occupancy)) {
    return NextResponse.json(
      { error: "Esgotado para o seu gênero." },
      { status: 409 }
    );
  }

  const existing = await prisma.ticket.findFirst({
    where: {
      eventId: event.id,
      userId: user.id,
      status: { in: ["pending", "paid"] },
    },
  });
  if (existing) {
    if (existing.status === "paid") {
      return NextResponse.json(
        { error: "Você já possui ingresso para este evento." },
        { status: 409 }
      );
    }
    // Reuse pending ticket for retry
    if (isMpDevBypass()) {
      await prisma.ticket.update({
        where: { id: existing.id },
        data: { status: "paid" },
      });
      return NextResponse.json({
        initPoint: `/pagamento/sucesso?ticket=${existing.id}`,
      });
    }
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

  const ticket = await prisma.ticket.create({
    data: {
      eventId: event.id,
      userId: user.id,
      status: "pending",
    },
  });

  if (isMpDevBypass()) {
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: "paid" },
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
    return NextResponse.json(
      { error: "Falha ao criar preferência de pagamento." },
      { status: 502 }
    );
  }
}
