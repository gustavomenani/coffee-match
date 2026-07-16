import { describe, it, expect } from "vitest";
import {
  PENDING_TICKET_TTL_MS,
  isPendingTicketExpired,
  resolveCheckoutTicket,
} from "@/lib/domain/checkout";

describe("checkout ticket helpers", () => {
  const now = new Date("2026-07-16T12:00:00.000Z");

  it("isPendingTicketExpired is false under TTL", () => {
    const createdAt = new Date(now.getTime() - PENDING_TICKET_TTL_MS + 1_000);
    expect(isPendingTicketExpired(createdAt, now)).toBe(false);
  });

  it("isPendingTicketExpired is true at/after TTL", () => {
    const createdAt = new Date(now.getTime() - PENDING_TICKET_TTL_MS);
    expect(isPendingTicketExpired(createdAt, now)).toBe(true);
  });

  it("rejects when a paid ticket already exists", () => {
    const decision = resolveCheckoutTicket(
      [
        {
          id: "t-paid",
          status: "paid",
          createdAt: new Date(now.getTime() - 60_000),
        },
        {
          id: "t-pending",
          status: "pending",
          createdAt: new Date(now.getTime() - 30_000),
        },
      ],
      now
    );
    expect(decision).toEqual({ action: "reject_paid" });
  });

  it("reuses the newest fresh pending ticket", () => {
    const decision = resolveCheckoutTicket(
      [
        {
          id: "t-old",
          status: "pending",
          createdAt: new Date(now.getTime() - 60_000),
        },
        {
          id: "t-new",
          status: "pending",
          createdAt: new Date(now.getTime() - 10_000),
        },
      ],
      now
    );
    expect(decision).toEqual({ action: "reuse_pending", ticketId: "t-new" });
  });

  it("creates new when only expired pending remains", () => {
    const decision = resolveCheckoutTicket(
      [
        {
          id: "t-stale",
          status: "pending",
          createdAt: new Date(now.getTime() - PENDING_TICKET_TTL_MS - 1),
        },
      ],
      now
    );
    expect(decision).toEqual({ action: "create_new" });
  });

  it("creates new when there are no tickets", () => {
    expect(resolveCheckoutTicket([], now)).toEqual({ action: "create_new" });
  });
});
