import { beforeEach, describe, expect, it, vi } from "vitest";

const eventFindFirst = vi.fn();
const eventUpdate = vi.fn();
const sessionFindUnique = vi.fn();
const sessionUpdateMany = vi.fn();
const ticketFindMany = vi.fn();
const voteFindMany = vi.fn();
const userFindMany = vi.fn();
const matchDeleteMany = vi.fn();
const matchCreateMany = vi.fn();
const transactionMock = vi.fn();
const requireAdminMock = vi.fn();
const auditLogMock = vi.fn();
const sendMatchesReadyEmailMock = vi.fn();
const sendPushToUsersMock = vi.fn();
const revalidatePathMock = vi.fn();

const tx = {
  eventSession: { updateMany: (...a: unknown[]) => sessionUpdateMany(...a) },
  match: {
    deleteMany: (...a: unknown[]) => matchDeleteMany(...a),
    createMany: (...a: unknown[]) => matchCreateMany(...a),
  },
  event: { update: (...a: unknown[]) => eventUpdate(...a) },
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    event: { findFirst: (...a: unknown[]) => eventFindFirst(...a) },
    eventSession: { findUnique: (...a: unknown[]) => sessionFindUnique(...a) },
    ticket: { findMany: (...a: unknown[]) => ticketFindMany(...a) },
    vote: { findMany: (...a: unknown[]) => voteFindMany(...a) },
    user: { findMany: (...a: unknown[]) => userFindMany(...a) },
    $transaction: (...a: unknown[]) => transactionMock(...a),
  },
}));
vi.mock("@/lib/authz", () => ({
  requireAdmin: (...a: unknown[]) => requireAdminMock(...a),
}));
vi.mock("@/lib/audit", () => ({ auditLog: (...a: unknown[]) => auditLogMock(...a) }));
vi.mock("@/lib/notify", () => ({
  sendMatchesReadyEmail: (...a: unknown[]) => sendMatchesReadyEmailMock(...a),
}));
vi.mock("@/lib/push", () => ({
  sendPushToUsers: (...a: unknown[]) => sendPushToUsersMock(...a),
}));
vi.mock("next/cache", () => ({
  revalidatePath: (...a: unknown[]) => revalidatePathMock(...a),
}));

import { closeVoting } from "@/lib/actions/admin-session";

const EVENT_ID = "ckevent00000000000000001";
const SESSION_ID = "cksession0000000000000001";
const ORG_ID = "ckorg000000000000000001";

const ANA = "ckuser00000000000000ana1";
const BIA = "ckuser00000000000000bia1";
const CAIO = "ckuser0000000000000caio1";
const DAVI = "ckuser0000000000000davi1";

const yes = (fromUserId: string, toUserId: string) => ({
  fromUserId,
  toUserId,
  interest: "yes" as const,
});
const no = (fromUserId: string, toUserId: string) => ({
  fromUserId,
  toUserId,
  interest: "no" as const,
});

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminMock.mockResolvedValue({
    ok: true,
    user: { id: "ckadmin00000000000000001", role: "admin" },
    membership: { organizationId: ORG_ID, organization: { id: ORG_ID } },
  });
  eventFindFirst.mockResolvedValue({
    id: EVENT_ID,
    title: "Noite Coffee Match",
    organizationId: ORG_ID,
  });
  sessionFindUnique.mockResolvedValue({ id: SESSION_ID, status: "voting_open" });
  // Everyone is paid and checked in unless a test says otherwise.
  ticketFindMany.mockResolvedValue(
    [ANA, BIA, CAIO, DAVI].map((userId) => ({ userId }))
  );
  voteFindMany.mockResolvedValue([]);
  userFindMany.mockResolvedValue([]);
  sessionUpdateMany.mockResolvedValue({ count: 1 });
  matchDeleteMany.mockResolvedValue({ count: 0 });
  matchCreateMany.mockResolvedValue({ count: 0 });
  eventUpdate.mockResolvedValue({});
  auditLogMock.mockResolvedValue(undefined);
  sendMatchesReadyEmailMock.mockResolvedValue(true);
  sendPushToUsersMock.mockResolvedValue(undefined);
  transactionMock.mockImplementation((fn: (c: unknown) => unknown) => fn(tx));
});

describe("closeVoting", () => {
  it("persists exactly the mutual pairs and closes the night", async () => {
    voteFindMany.mockResolvedValue([
      yes(ANA, BIA), // mutual with BIA
      yes(BIA, ANA),
      yes(CAIO, DAVI), // one-sided — DAVI said no
      no(DAVI, CAIO),
    ]);
    userFindMany.mockResolvedValue([
      { id: ANA, email: "ana@example.com" },
      { id: BIA, email: "bia@example.com" },
      { id: CAIO, email: "caio@example.com" },
      { id: DAVI, email: "davi@example.com" },
    ]);

    const res = await closeVoting(EVENT_ID);

    expect(res).toEqual({ ok: true });
    const created = matchCreateMany.mock.calls[0][0].data;
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ sessionId: SESSION_ID });
    expect([created[0].userAId, created[0].userBId].sort()).toEqual(
      [ANA, BIA].sort()
    );
    expect(eventUpdate).toHaveBeenCalledWith({
      where: { id: EVENT_ID },
      data: { status: "closed" },
    });
  });

  it("claims the session before touching matches, so a double close cannot wipe them", async () => {
    // A concurrent close already flipped the session: the guarded claim matches
    // no row. Nothing else in the transaction may run.
    sessionUpdateMany.mockResolvedValue({ count: 0 });
    voteFindMany.mockResolvedValue([yes(ANA, BIA), yes(BIA, ANA)]);

    const res = await closeVoting(EVENT_ID);

    expect(res).toEqual({ ok: false, error: "A votação não está aberta." });
    expect(matchDeleteMany).not.toHaveBeenCalled();
    expect(matchCreateMany).not.toHaveBeenCalled();
    expect(eventUpdate).not.toHaveBeenCalled();
    // The decisive part: the loser must not re-notify the whole room.
    expect(sendMatchesReadyEmailMock).not.toHaveBeenCalled();
    expect(sendPushToUsersMock).not.toHaveBeenCalled();
  });

  it("claims the session with a status guard, not a bare id", async () => {
    await closeVoting(EVENT_ID);
    expect(sessionUpdateMany).toHaveBeenCalledWith({
      where: { id: SESSION_ID, status: "voting_open" },
      data: { status: "voting_closed", votingClosesAt: expect.any(Date) },
    });
  });

  it("ignores votes from people who are no longer paid and checked in", async () => {
    // ANA was refunded after voting: her ticket is gone from the present list.
    ticketFindMany.mockResolvedValue([{ userId: BIA }, { userId: CAIO }]);

    await closeVoting(EVENT_ID);

    // The vote query itself must exclude her, in both directions — otherwise
    // she still matches and her phone is revealed to her counterpart.
    expect(voteFindMany).toHaveBeenCalledWith({
      where: {
        sessionId: SESSION_ID,
        fromUserId: { in: [BIA, CAIO] },
        toUserId: { in: [BIA, CAIO] },
      },
    });
  });

  it("notifies every voter exactly once, with their own match count", async () => {
    voteFindMany.mockResolvedValue([
      yes(ANA, BIA),
      yes(BIA, ANA),
      yes(ANA, CAIO), // ANA is in two pairs
      yes(CAIO, ANA),
    ]);
    userFindMany.mockResolvedValue([
      { id: ANA, email: "ana@example.com" },
      { id: BIA, email: "bia@example.com" },
      { id: CAIO, email: "caio@example.com" },
    ]);

    await closeVoting(EVENT_ID);

    expect(sendMatchesReadyEmailMock).toHaveBeenCalledTimes(3);
    const byEmail = Object.fromEntries(
      sendMatchesReadyEmailMock.mock.calls.map((c) => [c[0].to, c[0].matchCount])
    );
    expect(byEmail).toEqual({
      "ana@example.com": 2,
      "bia@example.com": 1,
      "caio@example.com": 1,
    });
  });

  it("closes a night with zero matches and still tells the voters", async () => {
    voteFindMany.mockResolvedValue([no(ANA, BIA), no(BIA, ANA)]);
    userFindMany.mockResolvedValue([
      { id: ANA, email: "ana@example.com" },
      { id: BIA, email: "bia@example.com" },
    ]);

    const res = await closeVoting(EVENT_ID);

    expect(res).toEqual({ ok: true });
    expect(matchCreateMany).not.toHaveBeenCalled();
    expect(eventUpdate).toHaveBeenCalled();
    expect(sendMatchesReadyEmailMock).toHaveBeenCalledTimes(2);
    expect(sendMatchesReadyEmailMock.mock.calls[0][0].matchCount).toBe(0);
  });

  it("sends push for the whole room in one call, not one per voter", async () => {
    voteFindMany.mockResolvedValue([yes(ANA, BIA), yes(BIA, ANA)]);
    userFindMany.mockResolvedValue([
      { id: ANA, email: "ana@example.com" },
      { id: BIA, email: "bia@example.com" },
    ]);

    await closeVoting(EVENT_ID);

    expect(sendPushToUsersMock).toHaveBeenCalledTimes(1);
    const [userIds, payloadFor] = sendPushToUsersMock.mock.calls[0];
    expect([...userIds].sort()).toEqual([ANA, BIA].sort());
    expect(payloadFor(ANA)).toMatchObject({
      url: `/evento/${EVENT_ID}/matches`,
    });
  });

  it("refuses an event from another organization without writing anything", async () => {
    eventFindFirst.mockResolvedValue(null);

    const res = await closeVoting(EVENT_ID);

    expect(res).toEqual({ ok: false, error: "Evento não encontrado." });
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("refuses a non-admin without reading the event", async () => {
    requireAdminMock.mockResolvedValue({ ok: false, error: "Acesso negado." });

    const res = await closeVoting(EVENT_ID);

    expect(res).toEqual({ ok: false, error: "Acesso negado." });
    expect(eventFindFirst).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("rejects a malformed event id before hitting auth or the database", async () => {
    const res = await closeVoting("not-a-cuid'; DROP TABLE--");

    expect(res).toEqual({ ok: false, error: "Evento inválido." });
    expect(requireAdminMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
  });
});
