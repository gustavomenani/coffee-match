import { describe, it, expect } from "vitest";
import {
  canSellTicket,
  remainingSpots,
  shouldMarkSoldOut,
} from "@/lib/domain/capacity";

describe("capacity", () => {
  const event = { capacityMen: 10, capacityWomen: 10 };

  it("allows sale when spots remain for gender", () => {
    expect(
      canSellTicket(event, "male", {
        paidMen: 9,
        paidWomen: 10,
        pendingMen: 0,
        pendingWomen: 0,
      })
    ).toBe(true);
  });

  it("blocks sale when paid+pending fills capacity", () => {
    expect(
      canSellTicket(event, "male", {
        paidMen: 9,
        paidWomen: 0,
        pendingMen: 1,
        pendingWomen: 0,
      })
    ).toBe(false);
  });

  it("computes remaining", () => {
    expect(
      remainingSpots(event, "female", {
        paidMen: 0,
        paidWomen: 3,
        pendingMen: 0,
        pendingWomen: 1,
      })
    ).toBe(6);
  });

  it("shouldMarkSoldOut is false when one gender still has spots", () => {
    expect(
      shouldMarkSoldOut(event, {
        paidMen: 10,
        paidWomen: 9,
        pendingMen: 0,
        pendingWomen: 0,
      })
    ).toBe(false);
  });

  it("shouldMarkSoldOut is true when both genders are full", () => {
    expect(
      shouldMarkSoldOut(event, {
        paidMen: 10,
        paidWomen: 8,
        pendingMen: 0,
        pendingWomen: 2,
      })
    ).toBe(true);
  });
});

