"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bustEventCaches } from "@/lib/cache-bust";
import { parseCuid } from "@/lib/security/ids";
import { syncEventSoldOutStatus } from "@/lib/sold-out";
import type { ActionResult } from "@/lib/action-result";

export async function cancelPendingTicket(
  rawTicketId: string
): Promise<ActionResult> {
  const ticketId = parseCuid(rawTicketId);
  if (!ticketId) {
    return { ok: false, error: "Ingresso inválido." };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Não autenticado." };
  }

  const ticket = await prisma.ticket.findFirst({
    where: {
      id: ticketId,
      userId: session.user.id,
      status: "pending",
    },
    include: {
      event: { select: { id: true, slug: true } },
    },
  });

  if (!ticket) {
    return { ok: false, error: "Pedido pendente não encontrado." };
  }

  // Guard on status, not just id. The findFirst above filtered on "pending",
  // but the webhook can flip this exact ticket to "paid" between that read and
  // this write — the user pays the MP link in one tab and cancels in the other.
  // Keyed on id alone, this cancelled a ticket the buyer had just paid for:
  // money captured, ticket dead, mpPaymentId set so nothing downstream notices.
  const cancelled = await prisma.ticket.updateMany({
    where: { id: ticket.id, status: "pending" },
    data: { status: "cancelled" },
  });

  if (cancelled.count === 0) {
    return { ok: false, error: "Este pedido já foi pago ou cancelado." };
  }

  await syncEventSoldOutStatus(ticket.eventId);
  bustEventCaches(ticket.event.slug);

  revalidatePath("/meus-ingressos");
  revalidatePath(`/meus-ingressos/${ticket.id}`);
  revalidatePath(`/eventos/${ticket.event.slug}`);
  revalidatePath("/admin");
  revalidatePath("/admin/eventos");

  return { ok: true };
}
