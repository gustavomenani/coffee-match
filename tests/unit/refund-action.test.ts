import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminMock = vi.fn();
const ticketFindFirst = vi.fn();
const ticketUpdateMany = vi.fn();
const refundPaymentMock = vi.fn();
const isMpDevBypassMock = vi.fn();
const syncSoldOutMock = vi.fn();
const bustEventCachesMock = vi.fn();
const auditLogMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("@/lib/authz", () => ({
  requireAdmin: (...args: unknown[]) => requireAdminMock(...args),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    ticket: {
      findFirst: (...a: unknown[]) => ticketFindFirst(...a),
      updateMany: (...a: unknown[]) => ticketUpdateMany(...a),
    },
  },
}));
vi.mock("@/lib/mercadopago", () => ({
  refundTicketPayment: (...a: unknown[]) => refundPaymentMock(...a),
  isMpDevBypass: (...a: unknown[]) => isMpDevBypassMock(...a),
}));
vi.mock("@/lib/actions/tickets", () => ({
  syncEventSoldOutStatus: (...a: unknown[]) => syncSoldOutMock(...a),
}));
vi.mock("@/lib/cache-bust", () => ({
  bustEventCaches: (...a: unknown[]) => bustEventCachesMock(...a),
}));
vi.mock("@/lib/audit", () => ({
  auditLog: (...args: unknown[]) => auditLogMock(...args),
}));
vi.mock("next/cache", () => ({
  revalidatePath: (...a: unknown[]) => revalidatePathMock(...a),
}));

import { refundTicket } from "@/lib/actions/refund";

const TICKET_ID = "ckticket0000000000000001";
const EVENT_ID = "ckevent00000000000000001";
const ADMIN_ID = "ckadmin00000000000000001";
const ORG_ID = "ckorg0000000000000000001";
const MP_PAYMENT_ID = "12345678901";

const admin = {
  ok: true as const,
  user: { id: ADMIN_ID, email: "admin@example.com", name: "Admin", role: "admin" },
  membership: {
    organizationId: ORG_ID,
    organization: { id: ORG_ID, slug: "coffee-match", name: "Coffee Match" },
  },
};

const paidTicket = {
  id: TICKET_ID,
  eventId: EVENT_ID,
  status: "paid",
  mpPaymentId: MP_PAYMENT_ID,
  event: { id: EVENT_ID, slug: "noite-coffee-match" },
};

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminMock.mockResolvedValue(admin);
  ticketFindFirst.mockResolvedValue(paidTicket);
  ticketUpdateMany.mockResolvedValue({ count: 1 });
  refundPaymentMock.mockResolvedValue({
    simulated: false,
    refundId: 987,
    status: "approved",
  });
  isMpDevBypassMock.mockReturnValue(false);
  syncSoldOutMock.mockResolvedValue(undefined);
  auditLogMock.mockResolvedValue(undefined);
});

describe("refundTicket", () => {
  it("rejects an invalid ticket id without touching auth or the DB", async () => {
    const result = await refundTicket("../../etc/passwd");
    expect(result).toEqual({ ok: false, error: "Ingresso inválido." });
    expect(requireAdminMock).not.toHaveBeenCalled();
    expect(ticketFindFirst).not.toHaveBeenCalled();
  });

  it("rejects non-admin callers before touching tickets", async () => {
    requireAdminMock.mockResolvedValue({ ok: false, error: "Acesso negado." });
    const result = await refundTicket(TICKET_ID);
    expect(result).toEqual({ ok: false, error: "Acesso negado." });
    expect(ticketFindFirst).not.toHaveBeenCalled();
    expect(ticketUpdateMany).not.toHaveBeenCalled();
  });

  it("errors when no paid ticket matches in the admin organization", async () => {
    // Covers not-paid, unknown id and tickets from another org alike:
    // the scoped findFirst simply matches nothing.
    ticketFindFirst.mockResolvedValue(null);
    const result = await refundTicket(TICKET_ID);
    expect(result).toEqual({ ok: false, error: "Ingresso pago não encontrado." });
    expect(ticketFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: TICKET_ID,
          status: "paid",
          event: { organizationId: ORG_ID },
        }),
      })
    );
    expect(refundPaymentMock).not.toHaveBeenCalled();
    expect(ticketUpdateMany).not.toHaveBeenCalled();
  });

  it("aborts without updating the ticket when the MP refund fails", async () => {
    refundPaymentMock.mockRejectedValue(new Error("mp down"));
    const result = await refundTicket(TICKET_ID);
    expect(result).toEqual({
      ok: false,
      error: "Falha ao reembolsar no Mercado Pago. Tente novamente.",
    });
    expect(ticketUpdateMany).not.toHaveBeenCalled();
    expect(syncSoldOutMock).not.toHaveBeenCalled();
    expect(auditLogMock).not.toHaveBeenCalled();
  });

  it("refunds on MP then marks refunded, syncs and audits", async () => {
    const result = await refundTicket(TICKET_ID);
    expect(result).toEqual({ ok: true });
    expect(refundPaymentMock).toHaveBeenCalledWith(MP_PAYMENT_ID);
    expect(ticketUpdateMany).toHaveBeenCalledWith({
      where: { id: TICKET_ID, status: "paid" },
      data: { status: "refunded" },
    });
    expect(syncSoldOutMock).toHaveBeenCalledWith(EVENT_ID);
    expect(bustEventCachesMock).toHaveBeenCalledWith("noite-coffee-match");
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: ADMIN_ID,
        action: "ticket.refunded",
        meta: expect.objectContaining({
          ticketId: TICKET_ID,
          refundId: 987,
          simulated: false,
        }),
      })
    );
    expect(revalidatePathMock).toHaveBeenCalledWith(
      `/admin/eventos/${EVENT_ID}`
    );
  });

  it("dev bypass refunds without calling Mercado Pago", async () => {
    isMpDevBypassMock.mockReturnValue(true);
    const result = await refundTicket(TICKET_ID);
    expect(result).toEqual({ ok: true });
    expect(refundPaymentMock).not.toHaveBeenCalled();
    expect(ticketUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "refunded" } })
    );
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "ticket.refunded",
        meta: expect.objectContaining({ refundId: null, simulated: true }),
      })
    );
  });

  it("stays idempotent when a concurrent refund already flipped the status", async () => {
    ticketUpdateMany.mockResolvedValue({ count: 0 });
    const result = await refundTicket(TICKET_ID);
    expect(result).toEqual({ ok: true });
    expect(syncSoldOutMock).not.toHaveBeenCalled();
    expect(auditLogMock).not.toHaveBeenCalled();
  });
});
