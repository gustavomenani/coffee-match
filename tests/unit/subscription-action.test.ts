import { beforeEach, describe, expect, it, vi } from "vitest";

const subFindUnique = vi.fn();
const subUpsert = vi.fn();
const subUpdate = vi.fn();
const queryRawMock = vi.fn();
const requireUserMock = vi.fn();
const rateLimitMock = vi.fn();
const auditLogMock = vi.fn();
const createPreapprovalMock = vi.fn();
const cancelPreapprovalMock = vi.fn();
const isMpDevBypassMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("@/lib/prisma", () => {
  // The real MP path runs inside prisma.$transaction with a tx-scoped advisory
  // lock (tx.$queryRaw). Route tx to the SAME method mocks so the existing
  // assertions (findUnique/upsert/cancel/create) still hold, and execute the
  // transaction callback synchronously.
  const client = {
    subscription: {
      findUnique: (...a: unknown[]) => subFindUnique(...a),
      upsert: (...a: unknown[]) => subUpsert(...a),
      update: (...a: unknown[]) => subUpdate(...a),
    },
    $queryRaw: (...a: unknown[]) => queryRawMock(...a),
  };
  return {
    prisma: {
      ...client,
      $transaction: (fn: (tx: unknown) => unknown) => fn(client),
    },
  };
});
vi.mock("@/lib/authz", () => ({
  requireUser: (...a: unknown[]) => requireUserMock(...a),
}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: (...a: unknown[]) => rateLimitMock(...a),
}));
vi.mock("@/lib/audit", () => ({ auditLog: (...a: unknown[]) => auditLogMock(...a) }));
vi.mock("@/lib/mercadopago", () => ({
  createSubscriptionPreapproval: (...a: unknown[]) => createPreapprovalMock(...a),
  cancelPreapproval: (...a: unknown[]) => cancelPreapprovalMock(...a),
  isMpDevBypass: () => isMpDevBypassMock(),
}));
vi.mock("next/cache", () => ({
  revalidatePath: (...a: unknown[]) => revalidatePathMock(...a),
}));

import { startSubscription, cancelSubscription } from "@/lib/actions/subscription";

const USER_ID = "ckuser000000000000000001";
const OLD_PREAPPROVAL = "preapproval-old-1";
const NEW_PREAPPROVAL = "preapproval-new-2";

beforeEach(() => {
  vi.clearAllMocks();
  requireUserMock.mockResolvedValue({
    ok: true,
    user: { id: USER_ID, email: "ana@example.com", name: "Ana", role: "participant" },
  });
  rateLimitMock.mockResolvedValue(true);
  isMpDevBypassMock.mockReturnValue(false);
  queryRawMock.mockResolvedValue([]);
  subFindUnique.mockResolvedValue(null);
  subUpsert.mockResolvedValue({});
  subUpdate.mockResolvedValue({});
  auditLogMock.mockResolvedValue(undefined);
  cancelPreapprovalMock.mockResolvedValue(undefined);
  createPreapprovalMock.mockResolvedValue({
    preapprovalId: NEW_PREAPPROVAL,
    initPoint: "https://mp.example/checkout",
  });
});

describe("startSubscription", () => {
  it("cancels the superseded preapproval before creating a replacement", async () => {
    // The user started once, never finished, and is trying again. The first
    // preapproval is still live on MP and would bill them in parallel.
    subFindUnique.mockResolvedValue({
      id: "cksub0000000000000000001",
      userId: USER_ID,
      status: "pending",
      mpPreapprovalId: OLD_PREAPPROVAL,
    });

    const res = await startSubscription();

    expect(res).toEqual({ ok: true, initPoint: "https://mp.example/checkout" });
    expect(cancelPreapprovalMock).toHaveBeenCalledWith(OLD_PREAPPROVAL);
    expect(cancelPreapprovalMock.mock.invocationCallOrder[0]).toBeLessThan(
      createPreapprovalMock.mock.invocationCallOrder[0]
    );
    expect(subUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ mpPreapprovalId: NEW_PREAPPROVAL }),
      })
    );
  });

  it("still subscribes, and audits the orphan, when MP cannot cancel the old id", async () => {
    subFindUnique.mockResolvedValue({
      status: "pending",
      mpPreapprovalId: OLD_PREAPPROVAL,
    });
    cancelPreapprovalMock.mockRejectedValue(new Error("mp down"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await startSubscription();

    // A stale id on MP's side must not block someone from subscribing...
    expect(res.ok).toBe(true);
    // ...but it must be findable later.
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "subscription.orphaned_preapproval",
        meta: expect.objectContaining({ preapprovalId: OLD_PREAPPROVAL }),
      })
    );
    consoleError.mockRestore();
  });

  it("has nothing to cancel on a first-time subscriber", async () => {
    subFindUnique.mockResolvedValue(null);

    await startSubscription();

    expect(cancelPreapprovalMock).not.toHaveBeenCalled();
    expect(createPreapprovalMock).toHaveBeenCalled();
  });

  it("refuses when already active, without touching MP", async () => {
    subFindUnique.mockResolvedValue({
      status: "active",
      mpPreapprovalId: OLD_PREAPPROVAL,
    });

    const res = await startSubscription();

    expect(res).toEqual({ ok: false, error: "Você já é assinante." });
    expect(cancelPreapprovalMock).not.toHaveBeenCalled();
    expect(createPreapprovalMock).not.toHaveBeenCalled();
  });

  it("refuses an unauthenticated caller before rate limiting", async () => {
    requireUserMock.mockResolvedValue({ ok: false, error: "Não autenticado." });

    const res = await startSubscription();

    expect(res).toEqual({ ok: false, error: "Não autenticado." });
    expect(rateLimitMock).not.toHaveBeenCalled();
    expect(createPreapprovalMock).not.toHaveBeenCalled();
  });
});

describe("cancelSubscription", () => {
  it("cancels on MP before marking the row cancelled", async () => {
    subFindUnique.mockResolvedValue({
      id: "cksub0000000000000000001",
      status: "active",
      mpPreapprovalId: OLD_PREAPPROVAL,
    });

    const res = await cancelSubscription();

    expect(res).toEqual({ ok: true });
    expect(cancelPreapprovalMock).toHaveBeenCalledWith(OLD_PREAPPROVAL);
    expect(cancelPreapprovalMock.mock.invocationCallOrder[0]).toBeLessThan(
      subUpdate.mock.invocationCallOrder[0]
    );
  });

  it("keeps the subscription active when MP refuses the cancel", async () => {
    subFindUnique.mockResolvedValue({
      id: "cksub0000000000000000001",
      status: "active",
      mpPreapprovalId: OLD_PREAPPROVAL,
    });
    cancelPreapprovalMock.mockRejectedValue(new Error("mp down"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await cancelSubscription();

    // Marking it cancelled locally while MP keeps billing is the worst outcome.
    expect(res.ok).toBe(false);
    expect(subUpdate).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("refuses when there is no active subscription", async () => {
    subFindUnique.mockResolvedValue({ status: "pending" });

    const res = await cancelSubscription();

    expect(res).toEqual({ ok: false, error: "Você não tem assinatura ativa." });
    expect(cancelPreapprovalMock).not.toHaveBeenCalled();
  });
});
