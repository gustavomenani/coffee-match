import { NextRequest, NextResponse } from "next/server";
import { Payment, MercadoPagoConfig } from "mercadopago";
import { prisma } from "@/lib/prisma";
import { syncEventSoldOutStatus } from "@/lib/actions/tickets";
import { verifyMercadoPagoSignature } from "@/lib/mp-webhook";
import { isProduction } from "@/lib/env";
import { auditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const paymentId =
    body?.data?.id?.toString() ||
    req.nextUrl.searchParams.get("data.id") ||
    req.nextUrl.searchParams.get("id");

  if (!paymentId) {
    return NextResponse.json({ ok: true });
  }

  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token || token.startsWith("TEST-DEV-BYPASS")) {
    // Ignore webhooks when running without a real MP token
    return NextResponse.json({ ok: true });
  }

  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");

  if (secret) {
    const valid = verifyMercadoPagoSignature({
      xSignature,
      xRequestId,
      dataId: paymentId,
      secret,
    });
    if (!valid) {
      console.error("[mp-webhook] invalid signature");
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }
  } else if (isProduction()) {
    console.error("[mp-webhook] MERCADOPAGO_WEBHOOK_SECRET missing in production");
    return NextResponse.json({ error: "misconfigured" }, { status: 500 });
  }

  try {
    const client = new MercadoPagoConfig({ accessToken: token });
    const payment = await new Payment(client).get({ id: paymentId });
    const ticketId = payment.external_reference;
    if (!ticketId || typeof ticketId !== "string") {
      return NextResponse.json({ ok: true });
    }

    if (payment.status === "approved") {
      const existingByPayment = await prisma.ticket.findUnique({
        where: { mpPaymentId: String(paymentId) },
      });
      if (existingByPayment) {
        return NextResponse.json({ ok: true });
      }

      const updated = await prisma.ticket.updateMany({
        where: {
          id: ticketId,
          status: { in: ["pending", "paid"] },
        },
        data: {
          status: "paid",
          mpPaymentId: String(paymentId),
        },
      });

      if (updated.count > 0) {
        const ticket = await prisma.ticket.findUnique({
          where: { id: ticketId },
          select: { eventId: true, userId: true },
        });
        if (ticket) {
          await syncEventSoldOutStatus(ticket.eventId);
          await auditLog({
            actorId: ticket.userId,
            action: "ticket.paid",
            meta: { ticketId, paymentId: String(paymentId), eventId: ticket.eventId },
          });
        }
      }
    }
  } catch (err) {
    console.error("Mercado Pago webhook error:", err);
    // 500 so MP retries on transient failures
    return NextResponse.json({ error: "processing_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
