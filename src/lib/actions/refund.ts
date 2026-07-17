"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { auditLog } from "@/lib/audit";
import { parseCuid } from "@/lib/security/ids";
import { syncEventSoldOutStatus } from "@/lib/actions/tickets";
import { bustEventCaches } from "@/lib/cache-bust";
import { isMpDevBypass, refundTicketPayment } from "@/lib/mercadopago";
import type { ActionResult } from "@/lib/action-result";

/**
 * Admin-only total refund of a paid ticket.
 * Refunds on Mercado Pago first; the ticket only becomes "refunded"
 * after the gateway accepts (or in dev bypass / tickets without payment).
 */
export async function refundTicket(rawTicketId: string): Promise<ActionResult> {
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
    include: { event: { select: { id: true, slug: true } } },
  });
  if (!ticket) {
    return { ok: false, error: "Ingresso pago não encontrado." };
  }

  let refundId: number | null = null;
  let simulated = true;
  if (ticket.mpPaymentId && !isMpDevBypass()) {
    try {
      const refund = await refundTicketPayment(ticket.mpPaymentId);
      refundId = refund.refundId;
      simulated = refund.simulated;
    } catch (err) {
      console.error("[refund] Mercado Pago refund failed", {
        ticketId,
        mpPaymentId: ticket.mpPaymentId,
        err,
      });
      return {
        ok: false,
        error: "Falha ao reembolsar no Mercado Pago. Tente novamente.",
      };
    }
  }

  // Guard the status again so a concurrent webhook refund stays idempotent.
  const updated = await prisma.ticket.updateMany({
    where: { id: ticketId, status: "paid" },
    data: { status: "refunded" },
  });

  if (updated.count > 0) {
    await syncEventSoldOutStatus(ticket.eventId);
    bustEventCaches(ticket.event.slug);
    await auditLog({
      actorId: admin.user.id,
      action: "ticket.refunded",
      meta: {
        ticketId,
        eventId: ticket.eventId,
        mpPaymentId: ticket.mpPaymentId ?? null,
        refundId,
        simulated,
      },
    });
  }

  revalidatePath(`/admin/eventos/${ticket.eventId}`);
  return { ok: true };
}
