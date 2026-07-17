import { beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";

const findUnique = vi.fn();
const update = vi.fn();
const rateLimitMock = vi.fn();
const auditLogMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => findUnique(...args),
      update: (...args: unknown[]) => update(...args),
    },
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: (...args: unknown[]) => rateLimitMock(...args),
}));

vi.mock("@/lib/audit", () => ({
  auditLog: (...args: unknown[]) => auditLogMock(...args),
}));

import { verifyLogin, MAX_FAILED } from "@/lib/login";

// cost 4 keeps the test fast; compare derives cost from the hash itself
const PASSWORD = "correct-horse-1";
const HASH = bcrypt.hashSync(PASSWORD, 4);

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "ckuser000000000000000001",
    email: "ana@example.com",
    passwordHash: HASH,
    name: "Ana",
    role: "participant",
    failedLoginCount: 0,
    lockedUntil: null,
    ...overrides,
  };
}

function credentials(password = PASSWORD) {
  return { email: "ana@example.com", password };
}

beforeEach(() => {
  vi.clearAllMocks();
  rateLimitMock.mockResolvedValue(true);
  update.mockResolvedValue({});
  auditLogMock.mockResolvedValue(undefined);
});

describe("verifyLogin", () => {
  it("logs in with correct credentials", async () => {
    findUnique.mockResolvedValue(makeUser());
    const result = await verifyLogin(credentials(), "1.2.3.4");
    expect(result).toMatchObject({ email: "ana@example.com" });
  });

  it("returns null and skips the DB when rate limited", async () => {
    rateLimitMock.mockResolvedValue(false);
    const result = await verifyLogin(credentials(), "1.2.3.4");
    expect(result).toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("rate limits by IP and by IP+email", async () => {
    findUnique.mockResolvedValue(makeUser());
    await verifyLogin(credentials(), "1.2.3.4");
    const keys = rateLimitMock.mock.calls.map((c) => c[0]);
    expect(keys).toContain("login:ip:1.2.3.4");
    expect(keys).toContain("login:1.2.3.4:ana@example.com");
  });

  it("returns null for unknown user", async () => {
    findUnique.mockResolvedValue(null);
    const result = await verifyLogin(credentials(), "1.2.3.4");
    expect(result).toBeNull();
    expect(update).not.toHaveBeenCalled();
  });

  it("increments failedLoginCount atomically on wrong password", async () => {
    findUnique.mockResolvedValue(makeUser({ failedLoginCount: 1 }));
    update.mockResolvedValueOnce({ failedLoginCount: 2 });
    const result = await verifyLogin(credentials("wrong-pass-1"), "1.2.3.4");
    expect(result).toBeNull();
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { failedLoginCount: { increment: 1 } },
      })
    );
    // Below the threshold: no second update setting lockedUntil
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("locks the account when reaching MAX_FAILED", async () => {
    findUnique.mockResolvedValue(
      makeUser({ failedLoginCount: MAX_FAILED - 1 })
    );
    update.mockResolvedValueOnce({ failedLoginCount: MAX_FAILED });
    const result = await verifyLogin(credentials("wrong-pass-1"), "1.2.3.4");
    expect(result).toBeNull();
    expect(update).toHaveBeenCalledTimes(2);
    const lockData = update.mock.calls[1][0].data;
    expect(lockData.lockedUntil).toBeInstanceOf(Date);
  });

  it("an expired lock starts a fresh window instead of re-locking on one typo", async () => {
    // failedLoginCount was only ever reset by a SUCCESSFUL login, so after one
    // lockout it stayed at the ceiling forever: the lock expires, the next
    // single typo increments 5 -> 6 >= MAX_FAILED, and the user is locked out
    // again. "5 attempts per window" silently became "1 attempt, permanently".
    findUnique.mockResolvedValue(
      makeUser({
        failedLoginCount: MAX_FAILED,
        lockedUntil: new Date(Date.now() - 60_000), // expired
      })
    );
    update.mockResolvedValueOnce({ failedLoginCount: 1 });

    const result = await verifyLogin(credentials("wrong-pass-1"), "1.2.3.4");

    expect(result).toBeNull();
    // The window restarts at 1 and the stale lock is cleared...
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { failedLoginCount: 1, lockedUntil: null },
      })
    );
    // ...and crucially, no second update re-locks the account.
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("does not increment counters while locked with wrong password", async () => {
    findUnique.mockResolvedValue(
      makeUser({
        failedLoginCount: MAX_FAILED,
        lockedUntil: new Date(Date.now() + 60_000),
      })
    );
    const result = await verifyLogin(credentials("wrong-pass-1"), "1.2.3.4");
    expect(result).toBeNull();
    expect(update).not.toHaveBeenCalled();
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "auth.login_locked" })
    );
  });

  it("soft lockout: correct password logs in even while locked and resets counters", async () => {
    findUnique.mockResolvedValue(
      makeUser({
        failedLoginCount: MAX_FAILED,
        lockedUntil: new Date(Date.now() + 60_000),
      })
    );
    const result = await verifyLogin(credentials(), "1.2.3.4");
    expect(result).toMatchObject({ email: "ana@example.com" });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { failedLoginCount: 0, lockedUntil: null },
      })
    );
  });

  it("clears an expired lock after a successful login", async () => {
    findUnique.mockResolvedValue(
      makeUser({
        failedLoginCount: 2,
        lockedUntil: new Date(Date.now() - 60_000),
      })
    );
    const result = await verifyLogin(credentials(), "1.2.3.4");
    expect(result).not.toBeNull();
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { failedLoginCount: 0, lockedUntil: null },
      })
    );
  });

  it("rejects malformed input without touching the DB", async () => {
    const result = await verifyLogin({ email: "not-an-email" }, "1.2.3.4");
    expect(result).toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });
});
