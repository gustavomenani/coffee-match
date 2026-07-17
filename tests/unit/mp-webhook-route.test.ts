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
vi.mock("@/lib/actions/tickets", () => ({
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
}));

import { POST } from "@/app/api/webhooks/mercadopago/route";

const TICKET_ID = "ckticket0000000000000001";
const EVENT_ID = "ckevent00000000000000001";
const PAYMENT_ID = "12345678901";

const ticketRow = {
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
    expect(ticketUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: TICKET_ID }),
        data: { status: "paid", mpPaymentId: PAYMENT_ID },
      })
    );
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "ticket.paid" })
    );
    expect(sendEmailMock).toHaveBeenCalled();
    expect(syncSoldOutMock).toHaveBeenCalledWith(EVENT_ID);
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

  it("ignores non-approved payments", async () => {
    paymentGetMock.mockResolvedValue(approvedPayment({ status: "rejected" }));
    const res = await POST(webhookRequest());
    expect(res.status).toBe(200);
    expect(ticketUpdateMany).not.toHaveBeenCalled();
  });

  it("does not send email when no pending ticket matched the update", async () => {
    ticketUpdateMany.mockResolvedValue({ count: 0 });
    const res = await POST(webhookRequest());
    expect(res.status).toBe(200);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("500 when the MP API errors so MP retries", async () => {
    paymentGetMock.mockRejectedValue(new Error("mp down"));
    const res = await POST(webhookRequest());
    expect(res.status).toBe(500);
  });
});
