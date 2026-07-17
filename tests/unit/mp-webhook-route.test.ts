import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const rateLimitMock = vi.fn();
const paymentGetMock = vi.fn();
const ticketFindUnique = vi.fn();
const ticketUpdateMany = vi.fn();
const syncSoldOutMock = vi.fn();
const auditLogMock = vi.fn();
const sendEmailMock = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: (...args: unknown[]) => rateLimitMock(...args),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    ticket: {
      findUnique: (...a: unknown[]) => ticketFindUnique(...a),
      updateMany: (...a: unknown[]) => ticketUpdateMany(...a),
    },
  },
}));
vi.mock("@/lib/sold-out", () => ({
  syncEventSoldOutStatus: (...a: unknown[]) => syncSoldOutMock(...a),
}));
vi.mock("@/lib/audit", () => ({
  auditLog: (...args: unknown[]) => auditLogMock(...args),
}));
vi.mock("@/lib/notify", () => ({
  sendTicketPaidEmail: (...a: unknown[]) => sendEmailMock(...a),
}));
vi.mock("mercadopago", () => ({
  MercadoPagoConfig: class {},
  Payment: class {
    get(...args: unknown[]) {
      return paymentGetMock(...args);
    }
  },
  PaymentRefund: class {},
}));

import { POST } from "@/app/api/webhooks/mercadopago/route";

const TICKET_ID = "ckticket0000000000000001";
const EVENT_ID = "ckevent00000000000000001";
const PAYMENT_ID = "12345678901";

const ticketRow = {
  status: "pending",
  mpPaymentId: null,
  eventId: EVENT_ID,
  userId: "ckuser000000000000000001",
  user: { email: "ana@example.com" },
  event: {
    title: "Noite Coffee Match",
    startsAt: new Date("2026-08-01T20:00:00Z"),
    venue: "Café Central",
    city: "São Paulo",
    priceCents: 4990,
    currency: "BRL",
  },
};

function approvedPayment(overrides: Record<string, unknown> = {}) {
  return {
    status: "approved",
    external_reference: TICKET_ID,
    transaction_amount: 49.9,
    currency_id: "BRL",
    ...overrides,
  };
}

function webhookRequest() {
  return new NextRequest("http://localhost/api/webhooks/mercadopago", {
    method: "POST",
    body: JSON.stringify({ data: { id: PAYMENT_ID } }),
    headers: { "content-type": "application/json" },
  });
}

const originalToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
const originalSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.MERCADOPAGO_ACCESS_TOKEN = "APP_USR-test-token";
  delete process.env.MERCADOPAGO_WEBHOOK_SECRET;
  rateLimitMock.mockResolvedValue(true);
  paymentGetMock.mockResolvedValue(approvedPayment());
  // 1st findUnique: lookup by mpPaymentId (idempotency); 2nd: ticket by id
  ticketFindUnique
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce(ticketRow);
  ticketUpdateMany.mockResolvedValue({ count: 1 });
  syncSoldOutMock.mockResolvedValue(undefined);
  auditLogMock.mockResolvedValue(undefined);
  sendEmailMock.mockResolvedValue(undefined);
});

afterEach(() => {
  process.env.MERCADOPAGO_ACCESS_TOKEN = originalToken;
  if (originalSecret === undefined) {
    delete process.env.MERCADOPAGO_WEBHOOK_SECRET;
  } else {
    process.env.MERCADOPAGO_WEBHOOK_SECRET = originalSecret;
  }
});

describe("POST /api/webhooks/mercadopago", () => {
  it("429 when rate limited", async () => {
    rateLimitMock.mockResolvedValue(false);
    const res = await POST(webhookRequest());
    expect(res.status).toBe(429);
    expect(paymentGetMock).not.toHaveBeenCalled();
  });

  it("marks the ticket paid for an approved payment with the exact amount", async () => {
    const res = await POST(webhookRequest());
    expect(res.status).toBe(200);
    // Exact `where`, not objectContaining: the `status: "pending"` guard is what
    // stops the webhook flipping a cancelled/refunded ticket back to paid, and a
    // loose matcher would stay green if someone deleted it.
    expect(ticketUpdateMany).toHaveBeenCalledWith({
      where: { id: TICKET_ID, status: "pending" },
      data: { status: "paid", mpPaymentId: PAYMENT_ID },
    });
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "ticket.paid" })
    );
    expect(sendEmailMock).toHaveBeenCalled();
    expect(syncSoldOutMock).toHaveBeenCalledWith(EVENT_ID);
  });

  it("honours the price the ticket was sold at after the admin edits the event", async () => {
    // The MP link was minted at R$49,90 and the buyer paid it. The admin has
    // since raised the event to R$99,90. Validating against the event's live
    // price would reject a legitimate payment, return 200 so MP never retries,
    // and leave the ticket pending until the cron cancels it: money captured,
    // no ticket, no refund.
    ticketFindUnique.mockReset();
    ticketFindUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
      ...ticketRow,
      priceCents: 4990, // snapshot taken at checkout
      currency: "BRL",
      event: { ...ticketRow.event, priceCents: 9990 }, // edited afterwards
    });

    const res = await POST(webhookRequest());

    expect(res.status).toBe(200);
    expect(ticketUpdateMany).toHaveBeenCalledWith({
      where: { id: TICKET_ID, status: "pending" },
      data: { status: "paid", mpPaymentId: PAYMENT_ID },
    });
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "ticket.paid" })
    );
  });

  it("falls back to the event price for tickets predating the snapshot", async () => {
    ticketFindUnique.mockReset();
    ticketFindUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
      ...ticketRow,
      priceCents: null,
      currency: null,
    });

    const res = await POST(webhookRequest());

    expect(res.status).toBe(200);
    expect(ticketUpdateMany).toHaveBeenCalled();
  });

  it("still rejects a payment that matches neither the snapshot nor the event", async () => {
    ticketFindUnique.mockReset();
    ticketFindUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
      ...ticketRow,
      priceCents: 4990,
      currency: "BRL",
    });
    paymentGetMock.mockResolvedValue(approvedPayment({ transaction_amount: 0.01 }));

    const res = await POST(webhookRequest());

    expect(res.status).toBe(200);
    expect(ticketUpdateMany).not.toHaveBeenCalled();
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "ticket.payment_amount_mismatch",
        meta: expect.objectContaining({ expectedCents: 4990, snapshotted: true }),
      })
    );
  });

  it("rejects an approved payment with the wrong amount", async () => {
    paymentGetMock.mockResolvedValue(
      approvedPayment({ transaction_amount: 0.01 })
    );
    const res = await POST(webhookRequest());
    expect(res.status).toBe(200); // 200 so MP stops retrying
    expect(ticketUpdateMany).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "ticket.payment_amount_mismatch" })
    );
  });

  it("rejects an approved payment in the wrong currency", async () => {
    paymentGetMock.mockResolvedValue(approvedPayment({ currency_id: "ARS" }));
    const res = await POST(webhookRequest());
    expect(res.status).toBe(200);
    expect(ticketUpdateMany).not.toHaveBeenCalled();
  });

  it("is idempotent: a payment already applied only re-syncs sold out", async () => {
    ticketFindUnique.mockReset();
    ticketFindUnique.mockResolvedValueOnce({
      id: TICKET_ID,
      eventId: EVENT_ID,
    });
    const res = await POST(webhookRequest());
    expect(res.status).toBe(200);
    expect(ticketUpdateMany).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(syncSoldOutMock).toHaveBeenCalledWith(EVENT_ID);
  });

  it("flags a duplicate approved payment for an already-paid ticket", async () => {
    ticketFindUnique.mockReset();
    ticketFindUnique
      .mockResolvedValueOnce(null) // no ticket carries THIS payment id
      .mockResolvedValueOnce({
        ...ticketRow,
        status: "paid",
        mpPaymentId: "999-original",
      });
    const res = await POST(webhookRequest());
    expect(res.status).toBe(200);
    expect(ticketUpdateMany).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "ticket.duplicate_payment" })
    );
  });

  it("ignores non-approved payments", async () => {
    paymentGetMock.mockResolvedValue(approvedPayment({ status: "rejected" }));
    const res = await POST(webhookRequest());
    expect(res.status).toBe(200);
    expect(ticketUpdateMany).not.toHaveBeenCalled();
  });

  it("flags an approved payment for a cancelled ticket instead of swallowing it", async () => {
    // The buyer paid a still-live MP link after the ticket was cancelled, so the
    // pending-guarded update matches nothing. Money is captured and no ticket
    // exists: this must leave a record, never a quiet 200.
    ticketFindUnique.mockReset();
    ticketFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...ticketRow, status: "cancelled" })
      // Re-read in the else branch: still genuinely cancelled, so this really is
      // money captured with no ticket.
      .mockResolvedValueOnce({
        status: "cancelled",
        mpPaymentId: null,
        eventId: EVENT_ID,
      });
    ticketUpdateMany.mockResolvedValue({ count: 0 });

    const res = await POST(webhookRequest());

    expect(res.status).toBe(200); // MP must not retry — retrying cannot help
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "ticket.paid_but_not_pending",
        meta: expect.objectContaining({
          ticketId: TICKET_ID,
          paymentId: PAYMENT_ID,
          ticketStatus: "cancelled",
        }),
      })
    );
  });

  it("does NOT raise a false refund alert when a concurrent delivery of the same payment won the race", async () => {
    // Two concurrent deliveries of the same approved payment. This one's pre-CAS
    // read still said "pending", but the other delivery flipped the ticket to
    // paid with THIS payment id microseconds earlier, so our guarded update
    // matches 0 rows. Re-reading must recognise the ticket is now correctly paid
    // with our payment and treat this as an idempotent duplicate delivery — the
    // old code fired "paid_but_not_pending / refundRequired", which would have an
    // operator refund a legitimately paid ticket.
    ticketFindUnique.mockReset();
    ticketFindUnique
      .mockResolvedValueOnce(null) // this payment id not yet recorded when we read
      .mockResolvedValueOnce(ticketRow) // ticket by id: still pending in our snapshot
      .mockResolvedValueOnce({
        // re-read after losing the CAS: now paid, by THIS same payment
        status: "paid",
        mpPaymentId: PAYMENT_ID,
        eventId: EVENT_ID,
      });
    ticketUpdateMany.mockResolvedValue({ count: 0 }); // we lost the race

    const res = await POST(webhookRequest());

    expect(res.status).toBe(200);
    expect(sendEmailMock).not.toHaveBeenCalled();
    // The whole point: no false money-captured-no-ticket / duplicate alert.
    expect(auditLogMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ action: "ticket.paid_but_not_pending" })
    );
    expect(auditLogMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ action: "ticket.duplicate_payment" })
    );
    // It just re-syncs sold-out, idempotently.
    expect(syncSoldOutMock).toHaveBeenCalledWith(EVENT_ID);
  });

  it("flags a duplicate when a DIFFERENT payment paid the ticket during the race", async () => {
    // We lost the pending→paid race to a DIFFERENT payment, so THIS payment is a
    // genuine duplicate charge — not money-captured-no-ticket.
    ticketFindUnique.mockReset();
    ticketFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(ticketRow)
      .mockResolvedValueOnce({
        status: "paid",
        mpPaymentId: "999-other-payment",
        eventId: EVENT_ID,
      });
    ticketUpdateMany.mockResolvedValue({ count: 0 });

    const res = await POST(webhookRequest());

    expect(res.status).toBe(200);
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "ticket.duplicate_payment",
        meta: expect.objectContaining({
          duplicatePaymentId: PAYMENT_ID,
          originalPaymentId: "999-other-payment",
        }),
      })
    );
    expect(auditLogMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ action: "ticket.paid_but_not_pending" })
    );
  });

  it("500 when the MP API errors so MP retries", async () => {
    paymentGetMock.mockRejectedValue(new Error("mp down"));
    const res = await POST(webhookRequest());
    expect(res.status).toBe(500);
  });

  it("marks a paid ticket refunded for a refunded payment", async () => {
    paymentGetMock.mockResolvedValue(approvedPayment({ status: "refunded" }));
    ticketFindUnique.mockReset();
    // Lookup by mpPaymentId finds the paid ticket directly.
    ticketFindUnique.mockResolvedValueOnce({
      id: TICKET_ID,
      eventId: EVENT_ID,
      userId: "ckuser000000000000000001",
      status: "paid",
    });

    const res = await POST(webhookRequest());
    expect(res.status).toBe(200);
    expect(ticketFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { mpPaymentId: PAYMENT_ID } })
    );
    // Exact where: the mpPaymentId guard binds the refund to the payment that was
    // actually recorded, so refunding a duplicate charge can't void the ticket.
    expect(ticketUpdateMany).toHaveBeenCalledWith({
      where: { id: TICKET_ID, status: "paid", mpPaymentId: PAYMENT_ID },
      data: { status: "refunded" },
    });
    expect(syncSoldOutMock).toHaveBeenCalledWith(EVENT_ID);
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "ticket.refund_webhook" })
    );
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("does not void a ticket when a DUPLICATE payment (not the one on record) is refunded", async () => {
    // Ticket T is paid by payment A. A duplicate charge B was made and correctly
    // left un-recorded (mpPaymentId stays A). An operator refunds B in the MP
    // dashboard. The refund webhook for B must NOT flip T to refunded.
    paymentGetMock.mockResolvedValue(approvedPayment({ status: "refunded" }));
    ticketFindUnique.mockReset();
    ticketFindUnique
      .mockResolvedValueOnce(null) // lookup by mpPaymentId=B misses (B never recorded)
      .mockResolvedValueOnce({
        // external_reference fallback finds T, which is paid by A
        id: TICKET_ID,
        eventId: EVENT_ID,
        userId: "ckuser000000000000000001",
        status: "paid",
        mpPaymentId: "A-original-payment",
      });
    // The mpPaymentId=B guard matches no row (T holds A).
    ticketUpdateMany.mockResolvedValue({ count: 0 });

    const res = await POST(webhookRequest());

    expect(res.status).toBe(200);
    // Attempted only under the payment-bound guard...
    expect(ticketUpdateMany).toHaveBeenCalledWith({
      where: { id: TICKET_ID, status: "paid", mpPaymentId: PAYMENT_ID },
      data: { status: "refunded" },
    });
    // ...and since nothing matched, the ticket is preserved: no refund recorded.
    expect(auditLogMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ action: "ticket.refund_webhook" })
    );
    expect(syncSoldOutMock).not.toHaveBeenCalled();
  });

  it("is idempotent when the refunded webhook is re-notified", async () => {
    paymentGetMock.mockResolvedValue(approvedPayment({ status: "refunded" }));
    ticketFindUnique.mockReset();
    ticketFindUnique.mockResolvedValueOnce({
      id: TICKET_ID,
      eventId: EVENT_ID,
      userId: "ckuser000000000000000001",
      status: "refunded",
    });
    // Already refunded: the guarded update matches no row.
    ticketUpdateMany.mockResolvedValue({ count: 0 });

    const res = await POST(webhookRequest());
    expect(res.status).toBe(200);
    expect(syncSoldOutMock).not.toHaveBeenCalled();
    expect(auditLogMock).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});
