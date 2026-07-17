import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const auditDeleteMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditLog: { deleteMany: (...a: unknown[]) => auditDeleteMany(...a) },
  },
}));
// The real getEnv() validates the whole schema and caches the first result,
// which would freeze CRON_SECRET across tests. Re-read process.env each call.
vi.mock("@/lib/env", () => ({
  getEnv: () => ({ CRON_SECRET: process.env.CRON_SECRET }),
}));

import { GET } from "@/app/api/cron/cleanup-audit/route";

const SECRET = "cron-secret-for-tests-0123456789";

function cronRequest(authorization?: string) {
  return new NextRequest("http://localhost/api/cron/cleanup-audit", {
    headers: authorization ? { authorization } : {},
  });
}

const originalSecret = process.env.CRON_SECRET;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = SECRET;
  auditDeleteMany.mockResolvedValue({ count: 3 });
});

afterEach(() => {
  if (originalSecret === undefined) {
    delete process.env.CRON_SECRET;
  } else {
    process.env.CRON_SECRET = originalSecret;
  }
});

describe("GET /api/cron/cleanup-audit", () => {
  it("503 when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(cronRequest(`Bearer ${SECRET}`));
    expect(res.status).toBe(503);
    expect(auditDeleteMany).not.toHaveBeenCalled();
  });

  it("401 without an Authorization header", async () => {
    const res = await GET(cronRequest());
    expect(res.status).toBe(401);
    expect(auditDeleteMany).not.toHaveBeenCalled();
  });

  it("401 for a non-Bearer authorization scheme", async () => {
    const res = await GET(cronRequest(SECRET));
    expect(res.status).toBe(401);
    expect(auditDeleteMany).not.toHaveBeenCalled();
  });

  it("401 for a wrong bearer token", async () => {
    const res = await GET(cronRequest("Bearer wrong-secret-0123456789abcdef"));
    expect(res.status).toBe(401);
    expect(auditDeleteMany).not.toHaveBeenCalled();
  });

  it("200 with the correct token deletes old entries and reports the count", async () => {
    const res = await GET(cronRequest(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ deleted: 3 });
    expect(auditDeleteMany).toHaveBeenCalledWith({
      where: { createdAt: { lt: expect.any(Date) } },
    });
    const cutoff = auditDeleteMany.mock.calls[0][0].where.createdAt.lt;
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
    expect(Date.now() - cutoff.getTime()).toBeGreaterThanOrEqual(
      ninetyDaysMs - 5_000
    );
    expect(Date.now() - cutoff.getTime()).toBeLessThanOrEqual(
      ninetyDaysMs + 5_000
    );
  });
});
