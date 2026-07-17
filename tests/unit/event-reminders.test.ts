import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const findManyMock = vi.fn();
const updateManyAndReturnMock = vi.fn();
const updateManyMock = vi.fn();
const sendReminderMock = vi.fn();
const auditLogMock = vi.fn();
const requireCronAuthMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ticket: {
      findMany: (...a: unknown[]) => findManyMock(...a),
      updateManyAndReturn: (...a: unknown[]) => updateManyAndReturnMock(...a),
      updateMany: (...a: unknown[]) => updateManyMock(...a),
    },
  },
}));
vi.mock("@/lib/notify", () => ({
  sendEventReminderEmail: (...a: unknown[]) => sendReminderMock(...a),
}));
vi.mock("@/lib/audit", () => ({ auditLog: (...a: unknown[]) => auditLogMock(...a) }));
vi.mock("@/lib/security/cron-auth", () => ({
  requireCronAuth: (...a: unknown[]) => requireCronAuthMock(...a),
}));

import { GET } from "@/app/api/cron/event-reminders/route";

function ticket(id: string) {
  return {
    id,
    user: { email: `${id}@example.com` },
    event: {
      title: "Noite Coffee Match",
      startsAt: new Date("2026-08-01T23:00:00Z"),
      venue: "Café Central",
      city: "São Paulo",
    },
  };
}

function req() {
  return new NextRequest("http://localhost/api/cron/event-reminders");
}

beforeEach(() => {
  vi.clearAllMocks();
  requireCronAuthMock.mockReturnValue(null); // authorized
  auditLogMock.mockResolvedValue(undefined);
  updateManyMock.mockResolvedValue({ count: 0 });
  sendReminderMock.mockResolvedValue(true);
});

describe("event-reminders cron", () => {
  it("only sends to tickets THIS run actually claimed (no double-send on overlap)", async () => {
    findManyMock.mockResolvedValue([ticket("a"), ticket("b")]);
    // A concurrent/overlapping run already claimed ticket "b" (its guarded
    // null→now flip); updateManyAndReturn only returns the rows we won.
    updateManyAndReturnMock.mockResolvedValue([{ id: "a" }]);

    const res = await GET(req());
    const body = await res.json();

    expect(body.reminded).toBe(1);
    expect(sendReminderMock).toHaveBeenCalledTimes(1);
    expect(sendReminderMock).toHaveBeenCalledWith(
      expect.objectContaining({ ticketId: "a" })
    );
    // We must NOT e-mail the ticket the other run claimed.
    expect(sendReminderMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ ticketId: "b" })
    );
  });

  it("releases the claim for a send that fails, so a later run retries it", async () => {
    findManyMock.mockResolvedValue([ticket("a")]);
    updateManyAndReturnMock.mockResolvedValue([{ id: "a" }]);
    sendReminderMock.mockResolvedValue(false); // provider rejected the message

    const res = await GET(req());
    const body = await res.json();

    expect(body.reminded).toBe(0);
    expect(body.failed).toBe(1);
    // Reset to null so the reminder is retried, not silently burned.
    expect(updateManyMock).toHaveBeenCalledWith({
      where: { id: { in: ["a"] } },
      data: { reminderSentAt: null },
    });
  });

  it("refuses an unauthorized caller", async () => {
    requireCronAuthMock.mockReturnValue(
      new Response("no", { status: 401 })
    );
    const res = await GET(req());
    expect(res.status).toBe(401);
    expect(findManyMock).not.toHaveBeenCalled();
  });
});
