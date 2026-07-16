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
