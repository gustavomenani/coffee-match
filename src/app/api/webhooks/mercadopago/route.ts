import { NextRequest, NextResponse } from "next/server";
import { Payment, MercadoPagoConfig } from "mercadopago";
import { prisma } from "@/lib/prisma";
import { getPreapprovalStatus } from "@/lib/mercadopago";
import { syncEventSoldOutStatus } from "@/lib/sold-out";
import { verifyMercadoPagoSignature } from "@/lib/mp-webhook";
import { isPaymentAmountValid } from "@/lib/domain/payment";
import { isProduction } from "@/lib/env";
import { auditLog } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { clientIpFromHeaders } from "@/lib/security/ip";
import { parseCuid } from "@/lib/security/ids";
import { sendTicketPaidEmail } from "@/lib/notify";
import { logError, logWarn, alertCritical } from "@/lib/observability";
import { formatDateTime } from "@/lib/datetime";

export async function POST(req: NextRequest) {
  const ip = clientIpFromHeaders(req.headers);
  if (!(await rateLimit(`mp-webhook:${ip}`, 60, 60_000))) {
    // MP retries with backoff, so throttling floods is safe.
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

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
      logWarn("mp_webhook.invalid_signature", { xRequestId });
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }
  } else if (isProduction()) {
    logError("mp_webhook.secret_missing", new Error("MERCADOPAGO_WEBHOOK_SECRET missing in production"));
    return NextResponse.json({ error: "misconfigured" }, { status: 500 });
  }

  // Subscription lifecycle: data.id is a preapproval id, not a payment id.
  if (body?.type === "subscription_preapproval") {
    try {
      const { status, externalReference } = await getPreapprovalStatus(
        paymentId
      );
      const userId = parseCuid(externalReference);
      const sub =
        (await prisma.subscription.findUnique({
          where: { mpPreapprovalId: paymentId },
        })) ??
        (userId
          ? await prisma.subscription.findUnique({ where: { userId } })
          : null);
      if (!sub || !status) {
        return NextResponse.json({ ok: true });
      }

      if (status === "authorized" && sub.status !== "active") {
        await prisma.subscription.update({
          where: { id: sub.id },
          data: {
            status: "active",
            mpPreapprovalId: paymentId,
            activatedAt: sub.activatedAt ?? new Date(),
            cancelledAt: null,
          },
        });
        await auditLog({
          actorId: sub.userId,
          action: "subscription.activated",
          meta: { preapprovalId: paymentId, via: "webhook" },
        });
      } else if (
        status === "authorized" &&
        sub.status === "active" &&
        sub.mpPreapprovalId !== paymentId
      ) {
        // A SECOND live preapproval for someone already subscribed — MP is
        // about to bill them twice and only one id is recorded, so
        // cancelSubscription could never stop this one. Same shape as
        // ticket.duplicate_payment: never overwrite the id, flag it loudly.
        await auditLog({
          actorId: sub.userId,
          action: "subscription.duplicate_preapproval",
          meta: {
            originalPreapprovalId: sub.mpPreapprovalId,
            duplicatePreapprovalId: paymentId,
          },
        });
        alertCritical("mp_webhook.duplicate_preapproval", {
          userId: sub.userId,
          originalPreapprovalId: sub.mpPreapprovalId,
          duplicatePreapprovalId: paymentId,
        });
      } else if (
        (status === "cancelled" || status === "paused") &&
        sub.status !== "cancelled"
      ) {
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { status: "cancelled", cancelledAt: new Date() },
        });
        await auditLog({
          actorId: sub.userId,
          action: "subscription.cancelled",
          meta: { preapprovalId: paymentId, via: "webhook", mpStatus: status },
        });
      }
      return NextResponse.json({ ok: true });
    } catch (err) {
      logError("mp_webhook.preapproval_failed", err, { preapprovalId: paymentId });
      return NextResponse.json({ error: "processing_error" }, { status: 500 });
    }
  }

  try {
    const client = new MercadoPagoConfig({ accessToken: token });
    const payment = await new Payment(client).get({ id: paymentId });
    const ticketId = parseCuid(payment.external_reference);

    if (payment.status === "refunded" || payment.status === "charged_back") {
      // Amount validation does not apply here: the money already left MP.
      // Locate by mpPaymentId first; external_reference is the fallback.
      const ticket =
        (await prisma.ticket.findUnique({
          where: { mpPaymentId: String(paymentId) },
        })) ??
        (ticketId
          ? await prisma.ticket.findUnique({ where: { id: ticketId } })
          : null);
      if (!ticket) {
        return NextResponse.json({ ok: true });
      }

      // Idempotent: only a currently paid ticket transitions to refunded.
      const updated = await prisma.ticket.updateMany({
        where: { id: ticket.id, status: "paid" },
        data: { status: "refunded" },
      });

      if (updated.count > 0) {
        await syncEventSoldOutStatus(ticket.eventId);
        await auditLog({
          actorId: ticket.userId,
          action: "ticket.refund_webhook",
          meta: {
            ticketId: ticket.id,
            paymentId: String(paymentId),
            eventId: ticket.eventId,
            paymentStatus: payment.status,
          },
        });
      }
      return NextResponse.json({ ok: true });
    }

    if (!ticketId) {
      return NextResponse.json({ ok: true });
    }

    if (payment.status === "approved") {
      const existingByPayment = await prisma.ticket.findUnique({
        where: { mpPaymentId: String(paymentId) },
      });
      if (existingByPayment) {
        // Already paid via this payment — keep sold_out in sync
        await syncEventSoldOutStatus(existingByPayment.eventId);
        return NextResponse.json({ ok: true });
      }

      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: {
          status: true,
          mpPaymentId: true,
          eventId: true,
          userId: true,
          priceCents: true,
          currency: true,
          user: { select: { email: true } },
          event: {
            select: {
              title: true,
              startsAt: true,
              venue: true,
              city: true,
              priceCents: true,
              currency: true,
            },
          },
        },
      });
      if (!ticket) {
        return NextResponse.json({ ok: true });
      }

      // A DIFFERENT approved payment for an already-paid ticket is a
      // duplicate charge. Never overwrite mpPaymentId (it would orphan the
      // original payment for refunds) — flag loudly for manual refund.
      if (ticket.status === "paid" && ticket.mpPaymentId !== String(paymentId)) {
        await auditLog({
          actorId: ticket.userId,
          action: "ticket.duplicate_payment",
          meta: {
            ticketId,
            originalPaymentId: ticket.mpPaymentId,
            duplicatePaymentId: String(paymentId),
            eventId: ticket.eventId,
          },
        });
        alertCritical("mp_webhook.duplicate_payment", {
          ticketId,
          originalPaymentId: ticket.mpPaymentId,
          duplicatePaymentId: String(paymentId),
        });
        return NextResponse.json({ ok: true });
      }

      // Validate against the price THIS TICKET was sold at, not the event's
      // current price. The MP preference was minted from the price at checkout
      // time; comparing against a live event.priceCents meant an admin editing
      // the price orphaned every in-flight payment — the buyer pays the old
      // link, the amounts disagree, we return 200 on purpose so MP never
      // retries, the ticket stays pending and the expire-pending cron cancels
      // it. Money captured, no ticket, no retry, no refund.
      //
      // Falls back to the event for tickets created before the snapshot column.
      const expected = {
        priceCents: ticket.priceCents ?? ticket.event.priceCents,
        currency: ticket.currency ?? ticket.event.currency,
      };
      const amountOk = isPaymentAmountValid(
        {
          transactionAmount: payment.transaction_amount,
          currencyId: payment.currency_id,
        },
        expected
      );
      if (!amountOk) {
        await auditLog({
          actorId: ticket.userId,
          action: "ticket.payment_amount_mismatch",
          meta: {
            ticketId,
            paymentId: String(paymentId),
            transactionAmount: payment.transaction_amount ?? null,
            currencyId: payment.currency_id ?? null,
            expectedCents: expected.priceCents,
            expectedCurrency: expected.currency,
            snapshotted: ticket.priceCents != null,
          },
        });
        logWarn("mp_webhook.amount_mismatch", {
          ticketId,
          paymentId: String(paymentId),
        });
        // 200 so MP does not retry a payment we will never accept.
        return NextResponse.json({ ok: true });
      }

      // Only a pending ticket may transition to paid here — same-payment
      // retries are handled by the mpPaymentId lookup above, and paid
      // tickets with another payment are flagged as duplicates.
      const updated = await prisma.ticket.updateMany({
        where: {
          id: ticketId,
          status: "pending",
        },
        data: {
          status: "paid",
          mpPaymentId: String(paymentId),
        },
      });

      if (updated.count > 0) {
        await syncEventSoldOutStatus(ticket.eventId);
        await auditLog({
          actorId: ticket.userId,
          action: "ticket.paid",
          meta: {
            ticketId,
            paymentId: String(paymentId),
            eventId: ticket.eventId,
          },
        });
        await sendTicketPaidEmail({
          to: ticket.user.email,
          eventTitle: ticket.event.title,
          eventWhen: formatDateTime(ticket.event.startsAt),
          venue: `${ticket.event.venue}, ${ticket.event.city}`,
          ticketId,
        });
      } else {
        // updateMany matched 0 rows: the ticket was not pending at write time.
        // Two very different shapes reach here and the stale `ticket` snapshot
        // (read BEFORE the CAS) cannot tell them apart, so re-read before raising
        // the highest-severity alert in the app. Crying "refund required" on a
        // legitimately paid ticket would have an operator refund real money and
        // destroy a valid ticket.
        const current = await prisma.ticket.findUnique({
          where: { id: ticketId },
          select: { status: true, mpPaymentId: true, eventId: true },
        });

        if (
          current?.status === "paid" &&
          current.mpPaymentId === String(paymentId)
        ) {
          // A CONCURRENT delivery of THIS SAME payment won the pending→paid CAS
          // microseconds earlier (our pre-CAS read still said "pending"). The
          // winner already emailed and synced — this is an idempotent duplicate
          // delivery, not an anomaly. Do NOT alert.
          await syncEventSoldOutStatus(current.eventId);
          return NextResponse.json({ ok: true });
        }

        if (
          current?.status === "paid" &&
          current.mpPaymentId !== String(paymentId)
        ) {
          // A DIFFERENT payment paid this ticket concurrently, so THIS payment is
          // a genuine duplicate charge — the same shape as the duplicate branch
          // above, which the pre-CAS read missed because the ticket still looked
          // pending then. Never overwrite mpPaymentId; flag for manual refund.
          await auditLog({
            actorId: ticket.userId,
            action: "ticket.duplicate_payment",
            meta: {
              ticketId,
              originalPaymentId: current.mpPaymentId,
              duplicatePaymentId: String(paymentId),
              eventId: ticket.eventId,
            },
          });
          alertCritical("mp_webhook.duplicate_payment", {
            ticketId,
            originalPaymentId: current.mpPaymentId,
            duplicatePaymentId: String(paymentId),
          });
          return NextResponse.json({ ok: true });
        }

        // Genuinely money-captured-no-ticket: the status is cancelled/refunded —
        // the buyer paid a still-live MP link after the ticket was cancelled (by
        // the user, by checkout's expired-pending sweep, or by the expire-pending
        // cron). Never 200 QUIETLY: alert loudly, then 200 so MP stops retrying a
        // payment we can never turn into a ticket. Not auto-refunded on purpose —
        // issuing money back is an explicit admin decision (src/lib/actions/refund.ts).
        await auditLog({
          actorId: ticket.userId,
          action: "ticket.paid_but_not_pending",
          meta: {
            ticketId,
            paymentId: String(paymentId),
            eventId: ticket.eventId,
            ticketStatus: current?.status ?? ticket.status,
            transactionAmount: payment.transaction_amount ?? null,
            currencyId: payment.currency_id ?? null,
          },
        });
        // Highest-severity business alert in the app: money captured, no ticket.
        alertCritical("mp_webhook.paid_but_not_pending", {
          ticketId,
          paymentId: String(paymentId),
          ticketStatus: current?.status ?? ticket.status,
          refundRequired: true,
        });
      }
    }
  } catch (err) {
    logError("mp_webhook.processing_failed", err, { paymentId: String(paymentId) });
    // 500 so MP retries on transient failures
    return NextResponse.json({ error: "processing_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
