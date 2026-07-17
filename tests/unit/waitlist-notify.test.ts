import { beforeEach, describe, expect, it, vi } from "vitest";

const eventFindUnique = vi.fn();
const eventUpdateMany = vi.fn();
const interestFindMany = vi.fn();
const interestUpdateManyAndReturn = vi.fn();
const interestUpdateMany = vi.fn();
const getEventOccupancyMock = vi.fn();
const sendSpotOpenedEmailMock = vi.fn();
const bustEventCachesMock = vi.fn();
const auditLogMock = vi.fn();
const isPushConfiguredMock = vi.fn(() => false);
const sendPushToUserMock = vi.fn();
const authMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    event: {
      findUnique: (...a: unknown[]) => eventFindUnique(...a),
      updateMany: (...a: unknown[]) => eventUpdateMany(...a),
    },
    eventInterest: {
      findMany: (...a: unknown[]) => interestFindMany(...a),
      updateManyAndReturn: (...a: unknown[]) => interestUpdateManyAndReturn(...a),
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
vi.mock("@/lib/push", () => ({
  isPushConfigured: () => isPushConfiguredMock(),
  sendPushToUser: (...a: unknown[]) => sendPushToUserMock(...a),
}));
vi.mock("@/lib/auth", () => ({
  auth: (...args: unknown[]) => authMock(...args),
}));
vi.mock("next/cache", () => ({
  revalidatePath: (...a: unknown[]) => revalidatePathMock(...a),
}));

import { syncEventSoldOutStatus } from "@/lib/sold-out";

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
  // count is load-bearing: the transition is claimed, and only the run that
  // wins the row goes on to notify the waitlist.
  eventUpdateMany.mockResolvedValue({ count: 1 });
  interestFindMany.mockResolvedValue([]);
  // Claim-and-return: by default claims nothing; tests that reopen a waitlist
  // override this to return the rows they win.
  interestUpdateManyAndReturn.mockResolvedValue([]);
  interestUpdateMany.mockResolvedValue({ count: 0 });
  // Mirrors the real signature: sendSpotOpenedEmail never throws, it reports
  // delivery as a boolean. A mock that resolves undefined would let the marking
  // logic look correct while suppressing every retry in production.
  sendSpotOpenedEmailMock.mockResolvedValue(true);
  auditLogMock.mockResolvedValue(undefined);
});

describe("syncEventSoldOutStatus waitlist notifications", () => {
  it("sold_out → published claims pending interests, then notifies them", async () => {
    eventFindUnique.mockResolvedValue({ ...baseEvent, status: "sold_out" });
    getEventOccupancyMock.mockResolvedValue(freeOccupancy);
    interestFindMany.mockResolvedValue(interests);
    // The claim wins both rows.
    interestUpdateManyAndReturn.mockResolvedValue(interests);

    await syncEventSoldOutStatus(EVENT_ID);

    // Claimed on the current status, not a bare id.
    expect(eventUpdateMany).toHaveBeenCalledWith({
      where: { id: EVENT_ID, status: "sold_out" },
      data: { status: "published" },
    });
    expect(interestFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { eventId: EVENT_ID, notifiedAt: null },
      })
    );
    // Rows are stamped BEFORE sending (guarded claim), returning what we won.
    expect(interestUpdateManyAndReturn).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: interests.map((i) => i.id) }, notifiedAt: null },
        data: { notifiedAt: expect.any(Date) },
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
    // All sends succeeded, so nothing is released back to null.
    expect(interestUpdateMany).not.toHaveBeenCalled();
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "event.waitlist_notified",
        meta: expect.objectContaining({ eventId: EVENT_ID, notified: 2 }),
      })
    );
    expect(bustEventCachesMock).toHaveBeenCalledWith(baseEvent.slug);
  });

  it("releases the claim on recipients whose e-mail did not go out", async () => {
    eventFindUnique.mockResolvedValue({ ...baseEvent, status: "sold_out" });
    getEventOccupancyMock.mockResolvedValue(freeOccupancy);
    interestFindMany.mockResolvedValue(interests);
    interestUpdateManyAndReturn.mockResolvedValue(interests);
    // Ana's send is rejected by the provider, Bia's goes out.
    sendSpotOpenedEmailMock
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    await syncEventSoldOutStatus(EVENT_ID);

    // One bad recipient must not block the other...
    expect(sendSpotOpenedEmailMock).toHaveBeenCalledTimes(2);
    // ...and Ana's claim must be RELEASED (notifiedAt back to null), or she is
    // retired from the waitlist forever and never told a spot opened.
    expect(interestUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: [interests[0].id] } },
      data: { notifiedAt: null },
    });
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: expect.objectContaining({ notified: 1, failed: 1 }),
      })
    );
  });

  it("releases the whole batch when the mail provider is down", async () => {
    eventFindUnique.mockResolvedValue({ ...baseEvent, status: "sold_out" });
    getEventOccupancyMock.mockResolvedValue(freeOccupancy);
    interestFindMany.mockResolvedValue(interests);
    interestUpdateManyAndReturn.mockResolvedValue(interests);
    sendSpotOpenedEmailMock.mockResolvedValue(false);

    await syncEventSoldOutStatus(EVENT_ID);

    // Every claim is released, so the whole waitlist stays eligible for the
    // next transition.
    expect(interestUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: interests.map((i) => i.id) } },
      data: { notifiedAt: null },
    });
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: expect.objectContaining({ notified: 0, failed: 2 }),
      })
    );
  });

  it("survives a send that throws and releases only that recipient", async () => {
    eventFindUnique.mockResolvedValue({ ...baseEvent, status: "sold_out" });
    getEventOccupancyMock.mockResolvedValue(freeOccupancy);
    interestFindMany.mockResolvedValue(interests);
    interestUpdateManyAndReturn.mockResolvedValue(interests);
    sendSpotOpenedEmailMock
      .mockRejectedValueOnce(new Error("unexpected"))
      .mockResolvedValueOnce(true);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await syncEventSoldOutStatus(EVENT_ID);

    // Ana threw → her claim is released; Bia stays claimed.
    expect(interestUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: [interests[0].id] } },
      data: { notifiedAt: null },
    });
    consoleError.mockRestore();
  });

  it("does not re-select an in-flight batch: a concurrent claim wins a disjoint set", async () => {
    // findMany returns two candidates, but a concurrent transition already
    // claimed one of them, so this run's guarded claim only wins the other.
    eventFindUnique.mockResolvedValue({ ...baseEvent, status: "sold_out" });
    getEventOccupancyMock.mockResolvedValue(freeOccupancy);
    interestFindMany.mockResolvedValue(interests);
    interestUpdateManyAndReturn.mockResolvedValue([interests[1]]); // only Bia won

    await syncEventSoldOutStatus(EVENT_ID);

    // We e-mail ONLY the row we actually claimed — never the one the other run took.
    expect(sendSpotOpenedEmailMock).toHaveBeenCalledTimes(1);
    expect(sendSpotOpenedEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: "bia@example.com" })
    );
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: expect.objectContaining({ notified: 1 }),
      })
    );
  });

  it("reopening with an empty waitlist sends nothing and audits nothing", async () => {
    eventFindUnique.mockResolvedValue({ ...baseEvent, status: "sold_out" });
    getEventOccupancyMock.mockResolvedValue(freeOccupancy);
    interestFindMany.mockResolvedValue([]);

    await syncEventSoldOutStatus(EVENT_ID);

    expect(eventUpdateMany).toHaveBeenCalled();
    expect(sendSpotOpenedEmailMock).not.toHaveBeenCalled();
    expect(interestUpdateMany).not.toHaveBeenCalled();
    expect(auditLogMock).not.toHaveBeenCalled();
  });

  it("published → sold_out sends no e-mail", async () => {
    eventFindUnique.mockResolvedValue({ ...baseEvent, status: "published" });
    getEventOccupancyMock.mockResolvedValue(fullOccupancy);

    await syncEventSoldOutStatus(EVENT_ID);

    expect(eventUpdateMany).toHaveBeenCalledWith({
      where: { id: EVENT_ID, status: "published" },
      data: { status: "sold_out" },
    });
    expect(interestFindMany).not.toHaveBeenCalled();
    expect(sendSpotOpenedEmailMock).not.toHaveBeenCalled();
  });

  it("does not blast the waitlist twice when two runs race the same reopen", async () => {
    // Two MP webhook deliveries for one sold-out event, or a webhook racing the
    // expire-pending cron: both read "sold_out" and both decide to reopen.
    // Only the run that claims the row may notify — otherwise both select the
    // same 50 interests (notifiedAt is stamped only after the sends) and e-mail
    // every one of them twice.
    eventFindUnique.mockResolvedValue({ ...baseEvent, status: "sold_out" });
    getEventOccupancyMock.mockResolvedValue(freeOccupancy);
    interestFindMany.mockResolvedValue(interests);
    eventUpdateMany.mockResolvedValue({ count: 0 }); // the other run won

    await syncEventSoldOutStatus(EVENT_ID);

    expect(sendSpotOpenedEmailMock).not.toHaveBeenCalled();
    expect(interestUpdateMany).not.toHaveBeenCalled();
    expect(auditLogMock).not.toHaveBeenCalled();
  });

  it("no transition touches nothing", async () => {
    eventFindUnique.mockResolvedValue({ ...baseEvent, status: "published" });
    getEventOccupancyMock.mockResolvedValue(freeOccupancy);

    await syncEventSoldOutStatus(EVENT_ID);

    expect(eventUpdateMany).not.toHaveBeenCalled();
    expect(sendSpotOpenedEmailMock).not.toHaveBeenCalled();
    expect(bustEventCachesMock).not.toHaveBeenCalled();
  });

  it("ignores events that are not published/sold_out", async () => {
    eventFindUnique.mockResolvedValue({ ...baseEvent, status: "draft" });

    await syncEventSoldOutStatus(EVENT_ID);

    expect(getEventOccupancyMock).not.toHaveBeenCalled();
    expect(eventUpdateMany).not.toHaveBeenCalled();
  });
});
