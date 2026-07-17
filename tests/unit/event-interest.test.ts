import { beforeEach, describe, expect, it, vi } from "vitest";

const rateLimitMock = vi.fn();
const auditLogMock = vi.fn();
const eventFindUnique = vi.fn();
const interestUpsert = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: (...args: unknown[]) => rateLimitMock(...args),
}));
vi.mock("@/lib/audit", () => ({
  auditLog: (...args: unknown[]) => auditLogMock(...args),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    event: { findUnique: (...a: unknown[]) => eventFindUnique(...a) },
    eventInterest: { upsert: (...a: unknown[]) => interestUpsert(...a) },
  },
}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.7" }),
}));

import { registerEventInterest } from "@/lib/actions/event-interest";

const EVENT_ID = "ckevent00000000000000001";
const EMAIL = "ana@example.com";

function interestForm(overrides: Record<string, string> = {}) {
  const form = new FormData();
  form.set("eventId", EVENT_ID);
  form.set("email", EMAIL);
  for (const [key, value] of Object.entries(overrides)) {
    form.set(key, value);
  }
  return form;
}

beforeEach(() => {
  vi.clearAllMocks();
  rateLimitMock.mockResolvedValue(true);
  auditLogMock.mockResolvedValue(undefined);
  eventFindUnique.mockResolvedValue({ id: EVENT_ID });
  interestUpsert.mockResolvedValue({ eventId: EVENT_ID, email: EMAIL });
});

describe("registerEventInterest", () => {
  it("filled honeypot fakes success without touching prisma or rate limits", async () => {
    const result = await registerEventInterest(interestForm({ _hp: "bot" }));
    expect(result).toEqual({ ok: true });
    expect(rateLimitMock).not.toHaveBeenCalled();
    expect(eventFindUnique).not.toHaveBeenCalled();
    expect(interestUpsert).not.toHaveBeenCalled();
    expect(auditLogMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid e-mail without touching prisma", async () => {
    const result = await registerEventInterest(
      interestForm({ email: "not-an-email" })
    );
    expect(result).toEqual({ ok: false, error: "Informe um e-mail válido." });
    expect(interestUpsert).not.toHaveBeenCalled();
  });

  it("rejects an invalid eventId", async () => {
    const result = await registerEventInterest(
      interestForm({ eventId: "../../etc/passwd" })
    );
    expect(result).toEqual({ ok: false, error: "Evento inválido." });
    expect(interestUpsert).not.toHaveBeenCalled();
  });

  it("registers interest for a valid e-mail on an existing event", async () => {
    const result = await registerEventInterest(interestForm());
    expect(result).toEqual({ ok: true });
    expect(interestUpsert).toHaveBeenCalledWith({
      where: { eventId_email: { eventId: EVENT_ID, email: EMAIL } },
      update: {},
      create: { eventId: EVENT_ID, email: EMAIL },
    });
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "event.interest" })
    );
  });

  it("normalizes the e-mail before persisting", async () => {
    const result = await registerEventInterest(
      interestForm({ email: "ANA@Example.COM" })
    );
    expect(result).toEqual({ ok: true });
    expect(interestUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { eventId: EVENT_ID, email: EMAIL },
      })
    );
  });

  it("duplicate registration is idempotent and still succeeds", async () => {
    // Upsert with empty update resolves to the existing row: no error, no leak.
    interestUpsert.mockResolvedValue({
      eventId: EVENT_ID,
      email: EMAIL,
      createdAt: new Date("2026-01-01T00:00:00Z"),
    });
    const first = await registerEventInterest(interestForm());
    const second = await registerEventInterest(interestForm());
    expect(first).toEqual({ ok: true });
    expect(second).toEqual({ ok: true });
    expect(interestUpsert).toHaveBeenCalledTimes(2);
  });

  it("returns a generic success without upsert when rate limited", async () => {
    rateLimitMock.mockResolvedValue(false);
    const result = await registerEventInterest(interestForm());
    expect(result).toEqual({ ok: true });
    expect(eventFindUnique).not.toHaveBeenCalled();
    expect(interestUpsert).not.toHaveBeenCalled();
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "event.interest_throttled" })
    );
  });

  it("evaluates every rate limit even when the first one blocks", async () => {
    // No short-circuit: the counters must stay accurate.
    rateLimitMock.mockResolvedValueOnce(false).mockResolvedValue(true);
    await registerEventInterest(interestForm());
    const keys = rateLimitMock.mock.calls.map((c) => c[0]);
    expect(keys).toContain("interest:ip:203.0.113.7");
    expect(keys).toContain(`interest:${EMAIL}`);
    expect(keys).toContain("interest:global");
  });

  it("throttles per IP rather than globally", async () => {
    await registerEventInterest(interestForm());
    const limits = Object.fromEntries(
      rateLimitMock.mock.calls.map((c) => [c[0], c[1]])
    );
    // The global bucket must be a circuit breaker, far above any real hour —
    // at 30/min it locked out every user on the platform at once.
    expect(limits["interest:global"]).toBeGreaterThanOrEqual(500);
    expect(limits["interest:ip:203.0.113.7"]).toBeLessThanOrEqual(30);
  });

  it("returns a generic success when the event does not exist", async () => {
    eventFindUnique.mockResolvedValue(null);
    const result = await registerEventInterest(interestForm());
    expect(result).toEqual({ ok: true });
    expect(interestUpsert).not.toHaveBeenCalled();
  });
});
