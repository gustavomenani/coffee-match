import { NextRequest, NextResponse } from "next/server";
import { Payment, MercadoPagoConfig } from "mercadopago";
import { prisma } from "@/lib/prisma";
import { shouldMarkSoldOut } from "@/lib/domain/capacity";
import { getEventOccupancy } from "@/lib/actions/tickets";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  // MP sends topic/query variants; support payment id in body.data.id or query
  const paymentId =
    body?.data?.id?.toString() ||
    req.nextUrl.searchParams.get("data.id") ||
    req.nextUrl.searchParams.get("id");

  if (!paymentId) return NextResponse.json({ ok: true });

  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token || token.startsWith("TEST-DEV-BYPASS")) {
    return NextResponse.json({ ok: true });
  }

  try {
    const client = new MercadoPagoConfig({ accessToken: token });
    const payment = await new Payment(client).get({ id: paymentId });
    const ticketId = payment.external_reference;
    if (!ticketId) return NextResponse.json({ ok: true });

    if (payment.status === "approved") {
      // Idempotent: updateMany + unique mpPaymentId
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
          select: { eventId: true },
        });
        if (ticket) {
          const event = await prisma.event.findUnique({
            where: { id: ticket.eventId },
          });
          if (event?.status === "published") {
            const occ = await getEventOccupancy(event.id);
            if (shouldMarkSoldOut(event, occ)) {
              await prisma.event.update({
                where: { id: event.id },
                data: { status: "sold_out" },
              });
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("Mercado Pago webhook error:", err);
    // Acknowledge to avoid aggressive retries on bad payloads
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
