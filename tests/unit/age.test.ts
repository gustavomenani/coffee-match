import { describe, it, expect } from "vitest";
import { isAtLeast18, yearsOldOn } from "@/lib/domain/age";

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
});
