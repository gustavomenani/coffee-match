import { beforeEach, describe, expect, it, vi } from "vitest";

const eventFindFirst = vi.fn();
const eventFindUnique = vi.fn();
const eventUpdate = vi.fn();
const eventCreate = vi.fn();
const requireAdminOrThrowMock = vi.fn();
const auditLogMock = vi.fn();
const bustEventCachesMock = vi.fn();
const getEventOccupancyMock = vi.fn();
const syncSoldOutMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    event: {
      findFirst: (...a: unknown[]) => eventFindFirst(...a),
      findUnique: (...a: unknown[]) => eventFindUnique(...a),
      update: (...a: unknown[]) => eventUpdate(...a),
      create: (...a: unknown[]) => eventCreate(...a),
    },
  },
}));
vi.mock("@/lib/authz", () => ({
  requireAdminOrThrow: (...a: unknown[]) => requireAdminOrThrowMock(...a),
}));
vi.mock("@/lib/audit", () => ({ auditLog: (...a: unknown[]) => auditLogMock(...a) }));
vi.mock("@/lib/cache-bust", () => ({
  bustEventCaches: (...a: unknown[]) => bustEventCachesMock(...a),
}));
vi.mock("@/lib/occupancy", () => ({
  getEventOccupancy: (...a: unknown[]) => getEventOccupancyMock(...a),
}));
vi.mock("@/lib/sold-out", () => ({
  syncEventSoldOutStatus: (...a: unknown[]) => syncSoldOutMock(...a),
}));
vi.mock("next/cache", () => ({
  revalidatePath: (...a: unknown[]) => revalidatePathMock(...a),
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { createEvent, updateEvent } from "@/lib/actions/admin";

const EVENT_ID = "ckevent00000000000000001";
const OTHER_ORG_ID = "ckorg00000000000000other";

function eventForm(overrides: Record<string, string> = {}) {
  const form = new FormData();
  form.set("title", "Noite Coffee Match");
  form.set("slug", "noite-coffee-match");
  form.set("venue", "Café Central");
  form.set("address", "Rua X, 1");
  form.set("city", "São Paulo");
  form.set("startsAt", "2026-08-01T20:00");
  form.set("endsAt", "2026-08-01T23:00");
  form.set("capacityMen", "20");
  form.set("capacityWomen", "20");
  // Dot, not comma: the field is <input type="number">, so the browser always
  // submits a dot regardless of locale.
  form.set("priceReais", "49.90");
  form.set("status", "published");
  for (const [k, v] of Object.entries(overrides)) form.set(k, v);
  return form;
}

const currentEvent = {
  id: EVENT_ID,
  slug: "noite-coffee-match",
  organizationId: OTHER_ORG_ID,
  status: "sold_out",
};

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminOrThrowMock.mockResolvedValue({
    ok: true,
    user: { id: "ckadmin00000000000000001", role: "admin" },
    membership: {
      organizationId: OTHER_ORG_ID,
      organization: { id: OTHER_ORG_ID, slug: "outra-casa", name: "Outra Casa" },
    },
  });
  eventFindFirst.mockResolvedValue(currentEvent);
  eventFindUnique.mockResolvedValue(null);
  eventUpdate.mockResolvedValue({ id: EVENT_ID });
  eventCreate.mockResolvedValue({ id: EVENT_ID, slug: "noite-coffee-match" });
  auditLogMock.mockResolvedValue(undefined);
  syncSoldOutMock.mockResolvedValue(undefined);
  getEventOccupancyMock.mockResolvedValue({
    paidMen: 0,
    paidWomen: 0,
    pendingMen: 0,
    pendingWomen: 0,
  });
});

describe("createEvent", () => {
  it("creates into the caller's own organization, not a hard-coded one", async () => {
    // It used to fall back to whatever org has slug "coffee-match", writing the
    // event into another tenant's catalog — where the creator could then never
    // see, edit, refund or run it, since every other action scopes by their own
    // organizationId.
    const res = await createEvent(eventForm());

    expect(res.ok).toBe(true);
    expect(eventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: OTHER_ORG_ID }),
      })
    );
    // It must not go looking for a "coffee-match" organization at all.
    expect(eventFindUnique).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: "coffee-match" } })
    );
  });
});

describe("updateEvent", () => {
  it("refuses capacity below what is already sold", async () => {
    getEventOccupancyMock.mockResolvedValue({
      paidMen: 18,
      paidWomen: 4,
      pendingMen: 2,
      pendingWomen: 0,
    });

    const res = await updateEvent(EVENT_ID, eventForm({ capacityMen: "10" }));

    // 20 men are already in. Accepting 10 makes remainingSpots negative.
    expect(res.ok).toBe(false);
    expect(eventUpdate).not.toHaveBeenCalled();
  });

  it("allows capacity exactly at what is already sold", async () => {
    getEventOccupancyMock.mockResolvedValue({
      paidMen: 20,
      paidWomen: 20,
      pendingMen: 0,
      pendingWomen: 0,
    });

    const res = await updateEvent(EVENT_ID, eventForm());

    expect(res.ok).toBe(true);
    expect(eventUpdate).toHaveBeenCalled();
  });

  it("reconciles sold_out after the capacity changes", async () => {
    // Raising capacity on a sold_out event left it sold_out: checkout 404s, the
    // freed seats are unbuyable, and the waitlist is never told.
    const res = await updateEvent(EVENT_ID, eventForm({ capacityMen: "30" }));

    expect(res.ok).toBe(true);
    expect(syncSoldOutMock).toHaveBeenCalledWith(EVENT_ID);
    expect(syncSoldOutMock.mock.invocationCallOrder[0]).toBeGreaterThan(
      eventUpdate.mock.invocationCallOrder[0]
    );
  });

  it("refuses an event outside the caller's organization", async () => {
    eventFindFirst.mockResolvedValue(null);

    const res = await updateEvent(EVENT_ID, eventForm());

    expect(res).toEqual({ ok: false, error: "Evento não encontrado." });
    expect(eventUpdate).not.toHaveBeenCalled();
  });

  it("scopes the lookup by organization", async () => {
    await updateEvent(EVENT_ID, eventForm());
    expect(eventFindFirst).toHaveBeenCalledWith({
      where: { id: EVENT_ID, organizationId: OTHER_ORG_ID },
    });
  });
});
