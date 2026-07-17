import { beforeEach, describe, expect, it, vi } from "vitest";

const eventFindUnique = vi.fn();
const eventUpdate = vi.fn();
const interestFindMany = vi.fn();
const interestUpdateMany = vi.fn();
const getEventOccupancyMock = vi.fn();
const sendSpotOpenedEmailMock = vi.fn();
const bustEventCachesMock = vi.fn();
const auditLogMock = vi.fn();
const authMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    event: {
      findUnique: (...a: unknown[]) => eventFindUnique(...a),
      update: (...a: unknown[]) => eventUpdate(...a),
    },
    eventInterest: {
      findMany: (...a: unknown[]) => interestFindMany(...a),
      updateMany: (...a: unknown[]) => interestUpdateMany(...a),
    },
  },
}));
vi.mock("@/lib/occupancy", () => ({
  getEventOccupancy: (...a: unknown[]) => getEventOccupancyMock(...a),
}));
vi.mock("@/lib/notify", () => ({
  sendSpotOpenedEmail: (...a: unknown[]) => sendSpotOpenedEmailMock(...a),
}));
vi.mock("@/lib/cache-bust", () => ({
  bustEventCaches: (...a: unknown[]) => bustEventCachesMock(...a),
}));
vi.mock("@/lib/audit", () => ({
  auditLog: (...args: unknown[]) => auditLogMock(...args),
}));
vi.mock("@/lib/auth", () => ({
  auth: (...args: unknown[]) => authMock(...args),
}));
vi.mock("next/cache", () => ({
  revalidatePath: (...a: unknown[]) => revalidatePathMock(...a),
}));

import { syncEventSoldOutStatus } from "@/lib/actions/tickets";

const EVENT_ID = "ckevent00000000000000001";

const baseEvent = {
  id: EVENT_ID,
  title: "Noite Coffee Match",
  slug: "noite-coffee-match",
  city: "São Paulo",
  capacityMen: 10,
  capacityWomen: 10,
};

const fullOccupancy = {
  paidMen: 10,
  paidWomen: 10,
  pendingMen: 0,
  pendingWomen: 0,
};

const freeOccupancy = {
  paidMen: 9,
  paidWomen: 10,
  pendingMen: 0,
  pendingWomen: 0,
};

const interests = [
  { id: "ckint0000000000000000001", email: "ana@example.com" },
  { id: "ckint0000000000000000002", email: "bia@example.com" },
];

beforeEach(() => {
  vi.clearAllMocks();
  eventUpdate.mockResolvedValue({});
  interestFindMany.mockResolvedValue([]);
  interestUpdateMany.mockResolvedValue({ count: 0 });
  sendSpotOpenedEmailMock.mockResolvedValue(undefined);
  auditLogMock.mockResolvedValue(undefined);
});

describe("syncEventSoldOutStatus waitlist notifications", () => {
  it("sold_out → published notifies pending interests and marks them", async () => {
    eventFindUnique.mockResolvedValue({ ...baseEvent, status: "sold_out" });
    getEventOccupancyMock.mockResolvedValue(freeOccupancy);
    interestFindMany.mockResolvedValue(interests);
    interestUpdateMany.mockResolvedValue({ count: 2 });

    await syncEventSoldOutStatus(EVENT_ID);

    expect(eventUpdate).toHaveBeenCalledWith({
      where: { id: EVENT_ID },
      data: { status: "published" },
    });
    expect(interestFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { eventId: EVENT_ID, notifiedAt: null },
      })
    );
    expect(sendSpotOpenedEmailMock).toHaveBeenCalledTimes(2);
    expect(sendSpotOpenedEmailMock).toHaveBeenCalledWith({
      to: "ana@example.com",
      eventTitle: baseEvent.title,
      eventSlug: baseEvent.slug,
      city: baseEvent.city,
    });
    expect(sendSpotOpenedEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: "bia@example.com" })
    );
    expect(interestUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: interests.map((i) => i.id) } },
      data: { notifiedAt: expect.any(Date) },
    });
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "event.waitlist_notified",
        meta: expect.objectContaining({ eventId: EVENT_ID, notified: 2 }),
      })
    );
    expect(bustEventCachesMock).toHaveBeenCalledWith(baseEvent.slug);
  });

  it("one failing recipient does not block the rest nor the marking", async () => {
    eventFindUnique.mockResolvedValue({ ...baseEvent, status: "sold_out" });
    getEventOccupancyMock.mockResolvedValue(freeOccupancy);
    interestFindMany.mockResolvedValue(interests);
    sendSpotOpenedEmailMock
      .mockRejectedValueOnce(new Error("smtp down"))
      .mockResolvedValueOnce(undefined);
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await syncEventSoldOutStatus(EVENT_ID);

    expect(sendSpotOpenedEmailMock).toHaveBeenCalledTimes(2);
    expect(interestUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: interests.map((i) => i.id) } },
      })
    );
    consoleError.mockRestore();
  });

  it("reopening with an empty waitlist sends nothing and audits nothing", async () => {
    eventFindUnique.mockResolvedValue({ ...baseEvent, status: "sold_out" });
    getEventOccupancyMock.mockResolvedValue(freeOccupancy);
    interestFindMany.mockResolvedValue([]);

    await syncEventSoldOutStatus(EVENT_ID);

    expect(eventUpdate).toHaveBeenCalled();
    expect(sendSpotOpenedEmailMock).not.toHaveBeenCalled();
    expect(interestUpdateMany).not.toHaveBeenCalled();
    expect(auditLogMock).not.toHaveBeenCalled();
  });

  it("published → sold_out sends no e-mail", async () => {
    eventFindUnique.mockResolvedValue({ ...baseEvent, status: "published" });
    getEventOccupancyMock.mockResolvedValue(fullOccupancy);

    await syncEventSoldOutStatus(EVENT_ID);

    expect(eventUpdate).toHaveBeenCalledWith({
      where: { id: EVENT_ID },
      data: { status: "sold_out" },
    });
    expect(interestFindMany).not.toHaveBeenCalled();
    expect(sendSpotOpenedEmailMock).not.toHaveBeenCalled();
  });

  it("no transition touches nothing", async () => {
    eventFindUnique.mockResolvedValue({ ...baseEvent, status: "published" });
    getEventOccupancyMock.mockResolvedValue(freeOccupancy);

    await syncEventSoldOutStatus(EVENT_ID);

    expect(eventUpdate).not.toHaveBeenCalled();
    expect(sendSpotOpenedEmailMock).not.toHaveBeenCalled();
    expect(bustEventCachesMock).not.toHaveBeenCalled();
  });

  it("ignores events that are not published/sold_out", async () => {
    eventFindUnique.mockResolvedValue({ ...baseEvent, status: "draft" });

    await syncEventSoldOutStatus(EVENT_ID);

    expect(getEventOccupancyMock).not.toHaveBeenCalled();
    expect(eventUpdate).not.toHaveBeenCalled();
  });
});
