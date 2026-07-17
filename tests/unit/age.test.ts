import { describe, it, expect } from "vitest";
import { ageFrom, isAtLeast18, yearsOldOn } from "@/lib/domain/age";

describe("age", () => {
  it("returns true when person is 18 on reference date", () => {
    expect(isAtLeast18(new Date("2006-07-16"), new Date("2024-07-16"))).toBe(true);
  });

  it("returns false when person turns 18 tomorrow", () => {
    expect(isAtLeast18(new Date("2006-07-17"), new Date("2024-07-16"))).toBe(false);
  });

  it("computes years old", () => {
    expect(yearsOldOn(new Date("1990-01-01"), new Date("2026-01-01"))).toBe(36);
  });

  // Age is a civil fact in Brazil, so it must turn over at São Paulo midnight —
  // never at the server's. These pin the window between SP midnight and UTC
  // midnight (21:00–23:59 SP), which is exactly when the events run.
  describe("São Paulo calendar day, not the server's", () => {
    // Signup stores the civil date as noon São Paulo (profile.ts).
    const bornOn = (civilDate: string) => new Date(`${civilDate}T12:00:00-03:00`);

    it("is still 17 at 21:00 SP the night before the 18th birthday", () => {
      // 2026-07-17T00:00Z is already the 17th in UTC, but only 21:00 on the
      // 16th in São Paulo — where this person is a minor for three more hours.
      expect(
        isAtLeast18(bornOn("2008-07-17"), new Date("2026-07-17T00:00:00Z"))
      ).toBe(false);
    });

    it("turns 18 at São Paulo midnight on the birthday", () => {
      expect(
        isAtLeast18(bornOn("2008-07-17"), new Date("2026-07-17T03:00:00Z"))
      ).toBe(true);
    });

    it("does not age the ballot a year early in the evening", () => {
      expect(
        ageFrom(bornOn("1998-07-17"), new Date("2026-07-17T00:00:00Z"))
      ).toBe(27);
    });

    it("still handles a Feb 29 birthday on a non-leap year", () => {
      // Civil practice in Brazil: the birthday completes on Mar 1.
      expect(isAtLeast18(bornOn("2008-02-29"), new Date("2026-02-28T15:00:00Z"))).toBe(false);
      expect(isAtLeast18(bornOn("2008-02-29"), new Date("2026-03-01T15:00:00Z"))).toBe(true);
    });
  });

  describe("ageFrom", () => {
    it("returns age minus one before the birthday in the current year", () => {
      expect(ageFrom(new Date("1998-09-15"), new Date("2026-07-16"))).toBe(27);
    });

    it("returns full age after the birthday in the current year", () => {
      expect(ageFrom(new Date("1998-03-10"), new Date("2026-07-16"))).toBe(28);
    });

    it("counts the birthday itself as already completed", () => {
      expect(ageFrom(new Date("1998-07-16"), new Date("2026-07-16"))).toBe(28);
    });
  });
});
