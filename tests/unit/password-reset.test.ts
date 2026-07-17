import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "crypto";

const tokenFindUnique = vi.fn();
const tokenUpdateMany = vi.fn();
const tokenDeleteMany = vi.fn();
const tokenCreate = vi.fn();
const userUpdate = vi.fn();
const userFindUnique = vi.fn();
const transactionMock = vi.fn();
const rateLimitMock = vi.fn();
const auditLogMock = vi.fn();
const sendEmailMock = vi.fn();
const afterMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    passwordResetToken: {
      findUnique: (...a: unknown[]) => tokenFindUnique(...a),
      updateMany: (...a: unknown[]) => tokenUpdateMany(...a),
      deleteMany: (...a: unknown[]) => tokenDeleteMany(...a),
      create: (...a: unknown[]) => tokenCreate(...a),
    },
    user: {
      update: (...a: unknown[]) => userUpdate(...a),
      findUnique: (...a: unknown[]) => userFindUnique(...a),
    },
    $transaction: (...a: unknown[]) => transactionMock(...a),
  },
}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: (...a: unknown[]) => rateLimitMock(...a),
}));
vi.mock("@/lib/audit", () => ({ auditLog: (...a: unknown[]) => auditLogMock(...a) }));
vi.mock("@/lib/notify", () => ({ sendEmail: (...a: unknown[]) => sendEmailMock(...a) }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.7" }),
}));
vi.mock("next/server", () => ({ after: (fn: () => unknown) => afterMock(fn) }));

import { resetPassword, requestPasswordReset } from "@/lib/actions/password-reset";

const RAW_TOKEN = "a".repeat(64);
const tokenHash = createHash("sha256").update(RAW_TOKEN).digest("hex");
const USER_ID = "ckuser000000000000000001";

function resetForm(overrides: Record<string, string> = {}) {
  const form = new FormData();
  form.set("token", RAW_TOKEN);
  form.set("password", "newpass123");
  form.set("passwordConfirm", "newpass123");
  for (const [k, v] of Object.entries(overrides)) form.set(k, v);
  return form;
}

beforeEach(() => {
  vi.clearAllMocks();
  rateLimitMock.mockResolvedValue(true);
  auditLogMock.mockResolvedValue(undefined);
  sendEmailMock.mockResolvedValue(true);
  tokenFindUnique.mockResolvedValue({
    id: "cktok0000000000000000001",
    userId: USER_ID,
    tokenHash,
    usedAt: null,
    expiresAt: new Date(Date.now() + 60 * 60_000),
  });
  tokenUpdateMany.mockResolvedValue({ count: 1 });
  tokenDeleteMany.mockResolvedValue({ count: 0 });
  transactionMock.mockResolvedValue([]);
});

describe("resetPassword", () => {
  it("claims the token atomically and swaps the password hash", async () => {
    const res = await resetPassword(resetForm());

    expect(res).toEqual({ ok: true });
    // The claim is a guarded updateMany on usedAt: null — the single-use guard.
    expect(tokenUpdateMany).toHaveBeenCalledWith({
      where: { id: "cktok0000000000000000001", usedAt: null },
      data: { usedAt: expect.any(Date) },
    });
    // ...and it happens before the password write.
    expect(tokenUpdateMany.mock.invocationCallOrder[0]).toBeLessThan(
      transactionMock.mock.invocationCallOrder[0]
    );
  });

  it("loses the race when a concurrent redeem already claimed the token", async () => {
    // Both requests pass the stale findUnique check; only one wins the claim.
    tokenUpdateMany.mockResolvedValue({ count: 0 });

    const res = await resetPassword(resetForm());

    expect(res).toEqual({ ok: false, error: "Link inválido ou expirado." });
    // The password must NOT be changed by the loser.
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("rejects an already-used token without claiming", async () => {
    tokenFindUnique.mockResolvedValue({
      id: "cktok0000000000000000001",
      userId: USER_ID,
      tokenHash,
      usedAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 60_000),
    });

    const res = await resetPassword(resetForm());

    expect(res).toEqual({ ok: false, error: "Link inválido ou expirado." });
    expect(tokenUpdateMany).not.toHaveBeenCalled();
  });

  it("rejects an expired token", async () => {
    tokenFindUnique.mockResolvedValue({
      id: "cktok0000000000000000001",
      userId: USER_ID,
      tokenHash,
      usedAt: null,
      expiresAt: new Date(Date.now() - 1000),
    });

    const res = await resetPassword(resetForm());
    expect(res).toEqual({ ok: false, error: "Link inválido ou expirado." });
    expect(tokenUpdateMany).not.toHaveBeenCalled();
  });

  it("looks the token up by its SHA-256 hash, never the raw token", async () => {
    await resetPassword(resetForm());
    expect(tokenFindUnique).toHaveBeenCalledWith({ where: { tokenHash } });
    // The raw token must not be the lookup key.
    expect(tokenFindUnique).not.toHaveBeenCalledWith({
      where: { tokenHash: RAW_TOKEN },
    });
  });

  it("rejects mismatched password confirmation without touching the DB", async () => {
    const res = await resetPassword(
      resetForm({ passwordConfirm: "different1" })
    );
    expect(res).toEqual({ ok: false, error: "As senhas não coincidem." });
    expect(tokenFindUnique).not.toHaveBeenCalled();
  });

  it("rejects a weak password with the policy error, not the token error", async () => {
    const res = await resetPassword(
      resetForm({ password: "short", passwordConfirm: "short" })
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain("mínimo");
  });
});

describe("requestPasswordReset", () => {
  it("returns generic success for an unknown e-mail and sends nothing", async () => {
    userFindUnique.mockResolvedValue(null);
    const form = new FormData();
    form.set("email", "nobody@example.com");

    const res = await requestPasswordReset(form);

    expect(res).toEqual({ ok: true });
    expect(tokenCreate).not.toHaveBeenCalled();
  });

  it("does the send off the response path via after()", async () => {
    userFindUnique.mockResolvedValue({ id: USER_ID, email: "ana@example.com" });
    tokenCreate.mockResolvedValue({});
    transactionMock.mockResolvedValue([]);
    const form = new FormData();
    form.set("email", "ana@example.com");

    const res = await requestPasswordReset(form);

    expect(res).toEqual({ ok: true });
    // The e-mail is scheduled with after(), not awaited inline — closes the
    // timing oracle between known and unknown addresses.
    expect(afterMock).toHaveBeenCalled();
  });
});
