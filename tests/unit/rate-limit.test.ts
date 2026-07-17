import { beforeEach, describe, expect, it, vi } from "vitest";

const queryRawMock = vi.fn();
const alertCriticalMock = vi.fn();
const logErrorMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: (...a: unknown[]) => queryRawMock(...a),
    rateLimitBucket: { deleteMany: () => Promise.resolve({ count: 0 }) },
  },
}));
vi.mock("@/lib/observability", () => ({
  logError: (...a: unknown[]) => logErrorMock(...a),
  alertCritical: (...a: unknown[]) => alertCriticalMock(...a),
}));

import { rateLimit } from "@/lib/rate-limit";

// Unique key per assertion so the module-global memory map does not bleed
// across tests (there is no window reset within a run).
let n = 0;
const freshKey = (prefix: string) => `${prefix}:${n++}`;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("rateLimit DB fallback", () => {
  it("clamps a critical key to a strict per-instance cap when the DB counter fails", async () => {
    queryRawMock.mockRejectedValue(new Error("db down"));
    const key = freshKey("login");

    const results: boolean[] = [];
    for (let i = 0; i < 8; i++) {
      // Caller asks for 30, but the critical fallback cap is 5.
      results.push(await rateLimit(key, 30, 60_000, { critical: true }));
    }

    expect(results.slice(0, 5).every(Boolean)).toBe(true);
    expect(results.slice(5).some((r) => r === false)).toBe(true);
    // Silent degradation must be surfaced.
    expect(logErrorMock).toHaveBeenCalledWith(
      "rate_limit.db_fallback",
      expect.anything(),
      expect.objectContaining({ key })
    );
    expect(alertCriticalMock).toHaveBeenCalled();
  });

  it("does not clamp a non-critical key (best-effort memory fallback)", async () => {
    queryRawMock.mockRejectedValue(new Error("db down"));
    const key = freshKey("interest");

    const results: boolean[] = [];
    for (let i = 0; i < 8; i++) {
      results.push(await rateLimit(key, 30, 60_000));
    }

    // limit 30 → all 8 allowed on the memory fallback.
    expect(results.every(Boolean)).toBe(true);
  });

  it("enforces the real limit from the DB counter on the happy path", async () => {
    // Simulate the counter returning an over-limit count.
    queryRawMock.mockResolvedValue([{ count: 6, resetAt: new Date(Date.now() + 60_000) }]);
    const ok = await rateLimit(freshKey("vote"), 5, 60_000);
    expect(ok).toBe(false);
  });
});
