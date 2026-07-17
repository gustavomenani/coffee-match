export type Gender = "male" | "female";

export type CapacityEvent = {
  capacityMen: number;
  capacityWomen: number;
};

export type Occupancy = {
  paidMen: number;
  paidWomen: number;
  pendingMen: number;
  pendingWomen: number;
};

export function emptyOccupancy(): Occupancy {
  return { paidMen: 0, paidWomen: 0, pendingMen: 0, pendingWomen: 0 };
}

export type OccupancyCountRow = {
  status: string;
  gender: string;
  count: number;
};

/** Build an Occupancy from SQL GROUP BY (status, gender) count rows. */
export function occupancyFromCounts(rows: OccupancyCountRow[]): Occupancy {
  const occ = emptyOccupancy();
  for (const row of rows) {
    const isMale = row.gender === "male";
    if (row.status === "paid") {
      if (isMale) occ.paidMen += row.count;
      else occ.paidWomen += row.count;
    } else if (row.status === "pending") {
      if (isMale) occ.pendingMen += row.count;
      else occ.pendingWomen += row.count;
    }
  }
  return occ;
}

export function remainingSpots(
  event: CapacityEvent,
  gender: Gender,
  occ: Occupancy
): number {
  if (gender === "male") {
    return event.capacityMen - occ.paidMen - occ.pendingMen;
  }
  return event.capacityWomen - occ.paidWomen - occ.pendingWomen;
}

export function canSellTicket(
  event: CapacityEvent,
  gender: Gender,
  occ: Occupancy
): boolean {
  return remainingSpots(event, gender, occ) > 0;
}

/** True when both genders have zero remaining spots (paid + pending). */
export function shouldMarkSoldOut(
  event: CapacityEvent,
  occ: Occupancy
): boolean {
  return (
    remainingSpots(event, "male", occ) <= 0 &&
    remainingSpots(event, "female", occ) <= 0
  );
}
