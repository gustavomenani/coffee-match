import { describe, it, expect } from "vitest";
import {
  emptyOccupancy,
  occupancyFromCounts,
} from "@/lib/domain/capacity";

describe("occupancyFromCounts", () => {
  it("returns zeros for no rows", () => {
    expect(occupancyFromCounts([])).toEqual(emptyOccupancy());
  });

  it("maps grouped counts to the occupancy buckets", () => {
    const occ = occupancyFromCounts([
      { status: "paid", gender: "male", count: 3 },
      { status: "paid", gender: "female", count: 2 },
      { status: "pending", gender: "male", count: 1 },
      { status: "pending", gender: "female", count: 4 },
    ]);
    expect(occ).toEqual({
      paidMen: 3,
      paidWomen: 2,
      pendingMen: 1,
      pendingWomen: 4,
    });
  });

  it("ignores statuses that do not consume capacity", () => {
    const occ = occupancyFromCounts([
      { status: "cancelled", gender: "male", count: 10 },
      { status: "refunded", gender: "female", count: 7 },
      { status: "paid", gender: "male", count: 1 },
    ]);
    expect(occ).toEqual({
      paidMen: 1,
      paidWomen: 0,
      pendingMen: 0,
      pendingWomen: 0,
    });
  });
});
