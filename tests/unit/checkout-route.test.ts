import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const authMock = vi.fn();
const rateLimitMock = vi.fn();
const userFindUnique = vi.fn();
const eventFindUnique = vi.fn();
const ticketFindMany = vi.fn();
const ticketFindFirst = vi.fn();
const ticketCreate = vi.fn();
const ticketUpdate = vi.fn();
const ticketUpdateMany = vi.fn();
const subscriptionFindUnique = vi.fn();
const getEventOccupancyMock = vi.fn();
const syncSoldOutMock = vi.fn();
const createPreferenceMock = vi.fn();
const isMpDevBypassMock = vi.fn();
const sendEmailMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: (...args: unknown[]) => authMock(...args),
}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimitDetailed: (...args: unknown[]) => rateLimitMock(...args),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: (...a: unknown[]) => userFindUnique(...a) },
    event: { findUnique: (...a: unknown[]) => eventFindUnique(...a) },
    ticket: {
      findMany: (...a: unknown[]) => ticketFindMany(...a),
      findFirst: (...a: unknown[]) => ticketFindFirst(...a),
      create: (...a: unknown[]) => ticketCreate(...a),
      update: (...a: unknown[]) => ticketUpdate(...a),
      updateMany: (...a: unknown[]) => ticketUpdateMany(...a),
    },
    subscription: {
      findUnique: (...a: unknown[]) => subscriptionFindUnique(...a),
    },
    // Sale transaction: run the callback with a tx exposing the same mocks
    // so thrown errors (CapacityError) propagate like the real client.
    $transaction: (fn: (tx: unknown) => unknown) =>
      fn({
        ticket: { create: (...a: unknown[]) => ticketCreate(...a) },
        $queryRaw: () => Promise.resolve([]),
      }),
  },
}));
vi.mock("@/lib/occupancy", () => ({
  getEventOccupancy: (...a: unknown[]) => getEventOccupancyMock(...a),
}));
vi.mock("@/lib/sold-out", () => ({
  syncEventSoldOutStatus: (...a: unknown[]) => syncSoldOutMock(...a),
}));
vi.mock("@/lib/mercadopago", () => ({
  createTicketPreference: (...a: unknown[]) => createPreferenceMock(...a),
  isMpDevBypass: (...a: unknown[]) => isMpDevBypassMock(...a),
}));
vi.mock("@/lib/notify", () => ({
  sendTicketPaidEmail: (...a: unknown[]) => sendEmailMock(...a),
}));

import { POST } from "@/app/api/checkout/route";

const USER_ID = "ckuser000000000000000001";
const EVENT_ID = "ckevent00000000000000001";
const TICKET_ID = "ckticket0000000000000001";

const user = {
  id: USER_ID,
  email: "ana@example.com",
  gender: "female",
};

const event = {
  id: EVENT_ID,
  title: "Noite Coffee Match",
  slug: "noite-coffee-match",
  venue: "Café Central",
  city: "São Paulo",
  startsAt: new Date("2026-08-01T20:00:00Z"),
  status: "published",
  capacityMen: 10,
  capacityWomen: 10,
  priceCents: 4990,
  currency: "BRL",
};

function checkoutRequest(eventId: string = EVENT_ID) {
  return new NextRequest("http://localhost/api/checkout", {
    method: "POST",
    body: JSON.stringify({ eventId }),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ user: { id: USER_ID } });
  rateLimitMock.mockResolvedValue({
    ok: true,
    remaining: 9,
    resetAt: Date.now() + 60_000,
  });
  userFindUnique.mockResolvedValue(user);
  eventFindUnique.mockResolvedValue(event);
  ticketFindMany.mockResolvedValue([]);
  ticketFindFirst.mockResolvedValue(null);
  ticketCreate.mockResolvedValue({ id: TICKET_ID, status: "pending" });
  subscriptionFindUnique.mockResolvedValue(null);
  ticketUpdate.mockResolvedValue({});
  ticketUpdateMany.mockResolvedValue({ count: 0 });
  getEventOccupancyMock.mockResolvedValue({
    paidMen: 0,
    paidWomen: 0,
    pendingMen: 0,
    pendingWomen: 0,
  });
  syncSoldOutMock.mockResolvedValue(undefined);
  isMpDevBypassMock.mockReturnValue(false);
  createPreferenceMock.mockResolvedValue({ init_point: "https://mp.test/pay" });
  sendEmailMock.mockResolvedValue(undefined);
});

describe("POST /api/checkout", () => {
  it("401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null);
    const res = await POST(checkoutRequest());
    expect(res.status).toBe(401);
  });

  it("429 when rate limited with Retry-After until the window resets", async () => {
    rateLimitMock.mockResolvedValue({
      ok: false,
      remaining: 0,
      resetAt: Date.now() + 30_000,
    });
    const res = await POST(checkoutRequest());
    expect(res.status).toBe(429);
    const retryAfter = Number(res.headers.get("Retry-After"));
    expect(retryAfter).toBeGreaterThanOrEqual(1);
    expect(retryAfter).toBeLessThanOrEqual(30);
  });

  it("429 Retry-After is at least 1 even when the window already reset", async () => {
    rateLimitMock.mockResolvedValue({
      ok: false,
      remaining: 0,
      resetAt: Date.now() - 5_000,
    });
    const res = await POST(checkoutRequest());
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("1");
  });

  it("400 for invalid eventId", async () => {
    const res = await POST(checkoutRequest("../../etc/passwd"));
    expect(res.status).toBe(400);
  });

  it("404 when the event is not published", async () => {
    eventFindUnique.mockResolvedValue({ ...event, status: "draft" });
    const res = await POST(checkoutRequest());
    expect(res.status).toBe(404);
  });

  it("403 for non-subscriber during early-access window", async () => {
    eventFindUnique.mockResolvedValue({
      ...event,
      earlyAccessUntil: new Date(Date.now() + 60 * 60 * 1000),
    });
    const res = await POST(checkoutRequest());
    expect(res.status).toBe(403);
    expect(ticketCreate).not.toHaveBeenCalled();
  });

  it("subscriber buys normally during early-access window", async () => {
    eventFindUnique.mockResolvedValue({
      ...event,
      earlyAccessUntil: new Date(Date.now() + 60 * 60 * 1000),
    });
    subscriptionFindUnique.mockResolvedValue({ status: "active" });
    const res = await POST(checkoutRequest());
    expect(res.status).toBe(200);
    expect(ticketCreate).toHaveBeenCalled();
  });

  it("409 when the user already has a paid ticket", async () => {
    ticketFindMany.mockResolvedValue([
      { id: TICKET_ID, status: "paid", createdAt: new Date() },
    ]);
    const res = await POST(checkoutRequest());
    expect(res.status).toBe(409);
    expect(ticketCreate).not.toHaveBeenCalled();
  });

  it("reuses a fresh pending ticket instead of creating a new one", async () => {
    ticketFindMany.mockResolvedValue([
      { id: TICKET_ID, status: "pending", createdAt: new Date() },
    ]);
    const res = await POST(checkoutRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.initPoint).toBe("https://mp.test/pay");
    expect(ticketCreate).not.toHaveBeenCalled();
    expect(createPreferenceMock).toHaveBeenCalledWith(
      expect.objectContaining({ ticketId: TICKET_ID })
    );
  });

  it("cancels expired pending tickets and creates a new one", async () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    ticketFindMany
      // Snapshot: one expired pending ticket.
      .mockResolvedValueOnce([
        { id: TICKET_ID, status: "pending", createdAt: threeHoursAgo },
      ])
      // Re-read after the cancel: it is gone, so the user needs a new ticket.
      .mockResolvedValueOnce([]);
    ticketUpdateMany.mockResolvedValue({ count: 1 });

    const res = await POST(checkoutRequest());

    expect(res.status).toBe(200);
    // Exact `where`: the status guard is what stops this cancelling a ticket
    // the webhook just marked paid, so a loose matcher would not protect it.
    expect(ticketUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: [TICKET_ID] }, status: "pending" },
      data: { status: "cancelled" },
    });
    expect(ticketCreate).toHaveBeenCalled();
  });

  it("does not resell when an 'expired' pending was paid during checkout", async () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    ticketFindMany
      .mockResolvedValueOnce([
        { id: TICKET_ID, status: "pending", createdAt: threeHoursAgo },
      ])
      // The guarded cancel matched nothing because the webhook got there first;
      // the re-read shows the ticket alive and paid.
      .mockResolvedValueOnce([
        { id: TICKET_ID, status: "paid", createdAt: threeHoursAgo },
      ]);
    ticketUpdateMany.mockResolvedValue({ count: 0 });

    const res = await POST(checkoutRequest());

    // The buyer already owns a paid ticket — never charge them a second time.
    expect(ticketCreate).not.toHaveBeenCalled();
    expect(createPreferenceMock).not.toHaveBeenCalled();
    expect(res.status).toBe(409);
  });

  it("409 when capacity for the user gender is exhausted", async () => {
    getEventOccupancyMock.mockResolvedValue({
      paidMen: 0,
      paidWomen: 10,
      pendingMen: 0,
      pendingWomen: 0,
    });
    const res = await POST(checkoutRequest());
    expect(res.status).toBe(409);
    expect(ticketCreate).not.toHaveBeenCalled();
  });

  it("409 when a concurrent request already paid (race re-check)", async () => {
    ticketFindFirst.mockResolvedValue({ id: TICKET_ID, status: "paid" });
    const res = await POST(checkoutRequest());
    expect(res.status).toBe(409);
    expect(ticketCreate).not.toHaveBeenCalled();
  });

  it("cancels the new ticket when the MP preference fails", async () => {
    createPreferenceMock.mockRejectedValue(new Error("mp down"));
    const res = await POST(checkoutRequest());
    expect(res.status).toBe(502);
    expect(ticketUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TICKET_ID },
        data: { status: "cancelled" },
      })
    );
  });

  it("cancels the new ticket when the preference has no init point", async () => {
    createPreferenceMock.mockResolvedValue({});
    const res = await POST(checkoutRequest());
    expect(res.status).toBe(502);
    expect(ticketUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TICKET_ID },
        data: { status: "cancelled" },
      })
    );
  });

  it("dev bypass marks the ticket paid and returns the success URL", async () => {
    isMpDevBypassMock.mockReturnValue(true);
    const res = await POST(checkoutRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.initPoint).toBe(`/pagamento/sucesso?ticket=${TICKET_ID}`);
    expect(ticketUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "paid" } })
    );
    expect(sendEmailMock).toHaveBeenCalled();
    expect(createPreferenceMock).not.toHaveBeenCalled();
  });
});
