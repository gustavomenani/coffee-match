import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const rateLimitMock = vi.fn();
const getPreapprovalStatusMock = vi.fn();
const subFindUnique = vi.fn();
const subUpdate = vi.fn();
const auditLogMock = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: (...a: unknown[]) => rateLimitMock(...a),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    subscription: {
      findUnique: (...a: unknown[]) => subFindUnique(...a),
      update: (...a: unknown[]) => subUpdate(...a),
    },
    ticket: { findUnique: vi.fn(), updateMany: vi.fn() },
  },
}));
vi.mock("@/lib/mercadopago", () => ({
  getPreapprovalStatus: (...a: unknown[]) => getPreapprovalStatusMock(...a),
}));
vi.mock("@/lib/actions/tickets", () => ({ syncEventSoldOutStatus: vi.fn() }));
vi.mock("@/lib/audit", () => ({ auditLog: (...a: unknown[]) => auditLogMock(...a) }));
vi.mock("@/lib/notify", () => ({ sendTicketPaidEmail: vi.fn() }));
vi.mock("mercadopago", () => ({
  MercadoPagoConfig: class {},
  Payment: class {
    get() {
      throw new Error("payment API must not be called for a preapproval event");
    }
  },
  PaymentRefund: class {},
}));

import { POST } from "@/app/api/webhooks/mercadopago/route";

const USER_ID = "ckuser000000000000000001";
const SUB_ID = "cksub0000000000000000001";
const OLD_PREAPPROVAL = "preapproval-old-1";
const NEW_PREAPPROVAL = "preapproval-new-2";

function preapprovalWebhook(id: string) {
  return new NextRequest("http://localhost/api/webhooks/mercadopago", {
    method: "POST",
    body: JSON.stringify({ type: "subscription_preapproval", data: { id } }),
    headers: { "content-type": "application/json" },
  });
}

const originalToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.MERCADOPAGO_ACCESS_TOKEN = "APP_USR-test-token";
  delete process.env.MERCADOPAGO_WEBHOOK_SECRET;
  rateLimitMock.mockResolvedValue(true);
  auditLogMock.mockResolvedValue(undefined);
  subUpdate.mockResolvedValue({});
});

afterEach(() => {
  process.env.MERCADOPAGO_ACCESS_TOKEN = originalToken;
});

describe("POST /api/webhooks/mercadopago — subscription_preapproval", () => {
  it("activates a pending subscription when MP authorizes it", async () => {
    getPreapprovalStatusMock.mockResolvedValue({
      status: "authorized",
      externalReference: USER_ID,
    });
    subFindUnique.mockResolvedValue({
      id: SUB_ID,
      userId: USER_ID,
      status: "pending",
      mpPreapprovalId: NEW_PREAPPROVAL,
      activatedAt: null,
    });

    const res = await POST(preapprovalWebhook(NEW_PREAPPROVAL));

    expect(res.status).toBe(200);
    expect(subUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: SUB_ID },
        data: expect.objectContaining({
          status: "active",
          mpPreapprovalId: NEW_PREAPPROVAL,
        }),
      })
    );
  });

  it("flags a second authorized preapproval instead of ignoring it", async () => {
    // The user authorized an old, superseded link while already subscribed.
    // MP will now bill them twice and only one id is on the row, so
    // cancelSubscription could never stop the other one.
    getPreapprovalStatusMock.mockResolvedValue({
      status: "authorized",
      externalReference: USER_ID,
    });
    subFindUnique
      .mockResolvedValueOnce(null) // no row carries this preapproval id
      .mockResolvedValueOnce({
        id: SUB_ID,
        userId: USER_ID,
        status: "active",
        mpPreapprovalId: NEW_PREAPPROVAL,
      });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(preapprovalWebhook(OLD_PREAPPROVAL));

    expect(res.status).toBe(200);
    // Never overwrite the recorded id — that would orphan the other one.
    expect(subUpdate).not.toHaveBeenCalled();
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "subscription.duplicate_preapproval",
        meta: expect.objectContaining({
          originalPreapprovalId: NEW_PREAPPROVAL,
          duplicatePreapprovalId: OLD_PREAPPROVAL,
        }),
      })
    );
    consoleError.mockRestore();
  });

  it("is idempotent when MP re-notifies an authorization already applied", async () => {
    getPreapprovalStatusMock.mockResolvedValue({
      status: "authorized",
      externalReference: USER_ID,
    });
    subFindUnique.mockResolvedValue({
      id: SUB_ID,
      userId: USER_ID,
      status: "active",
      mpPreapprovalId: NEW_PREAPPROVAL,
    });

    const res = await POST(preapprovalWebhook(NEW_PREAPPROVAL));

    expect(res.status).toBe(200);
    expect(subUpdate).not.toHaveBeenCalled();
    expect(auditLogMock).not.toHaveBeenCalled();
  });

  it("cancels the subscription when MP reports it cancelled", async () => {
    getPreapprovalStatusMock.mockResolvedValue({
      status: "cancelled",
      externalReference: USER_ID,
    });
    subFindUnique.mockResolvedValue({
      id: SUB_ID,
      userId: USER_ID,
      status: "active",
      mpPreapprovalId: NEW_PREAPPROVAL,
    });

    const res = await POST(preapprovalWebhook(NEW_PREAPPROVAL));

    expect(res.status).toBe(200);
    expect(subUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "cancelled" }),
      })
    );
  });

  it("500s so MP retries when the preapproval lookup fails", async () => {
    getPreapprovalStatusMock.mockRejectedValue(new Error("mp down"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(preapprovalWebhook(NEW_PREAPPROVAL));

    expect(res.status).toBe(500);
    consoleError.mockRestore();
  });
});
