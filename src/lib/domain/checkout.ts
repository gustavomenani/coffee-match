/** Pending tickets older than this are cancelled on a new checkout attempt. */
export const PENDING_TICKET_TTL_MS = 2 * 60 * 60 * 1000;

export type CheckoutTicketRow = {
  id: string;
  status: string;
  createdAt: Date;
};

export type CheckoutTicketDecision =
  | { action: "reject_paid" }
  | { action: "reuse_pending"; ticketId: string }
  | { action: "create_new" };

export function isPendingTicketExpired(
  createdAt: Date,
  now: Date = new Date(),
  ttlMs: number = PENDING_TICKET_TTL_MS
): boolean {
  return now.getTime() - createdAt.getTime() >= ttlMs;
}

/**
 * Resolve what checkout should do for an existing set of tickets for the same
 * user+event (after expired pendings have been cancelled or filtered out).
 * Prefer a single paid ticket (block), else newest fresh pending (reuse), else create.
 */
export function resolveCheckoutTicket(
  tickets: CheckoutTicketRow[],
  now: Date = new Date()
): CheckoutTicketDecision {
  if (tickets.some((t) => t.status === "paid")) {
    return { action: "reject_paid" };
  }

  const freshPending = tickets
    .filter(
      (t) => t.status === "pending" && !isPendingTicketExpired(t.createdAt, now)
    )
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  if (freshPending[0]) {
    return { action: "reuse_pending", ticketId: freshPending[0].id };
  }

  return { action: "create_new" };
}
