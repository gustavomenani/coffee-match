import { describe, it, expect } from "vitest";
import {
  INTERESTS,
  MAX_INTERESTS,
  sanitizeInterests,
} from "@/lib/domain/interests";

describe("sanitizeInterests", () => {
  it("keeps valid interests in order", () => {
    expect(sanitizeInterests(["Café", "Trilhas", "Pets"])).toEqual([
      "Café",
      "Trilhas",
      "Pets",
    ]);
  });

  it("filters out unknown values and non-strings", () => {
    expect(
      sanitizeInterests(["Café", "Paraquedismo", 42, null, "Vinho", {}])
    ).toEqual(["Café", "Vinho"]);
  });

  it("removes duplicates", () => {
    expect(sanitizeInterests(["Café", "Café", "Vinho", "Café"])).toEqual([
      "Café",
      "Vinho",
    ]);
  });

  it(`caps the list at MAX_INTERESTS (${MAX_INTERESTS})`, () => {
    const result = sanitizeInterests([...INTERESTS]);
    expect(result).toHaveLength(MAX_INTERESTS);
    expect(result).toEqual(INTERESTS.slice(0, MAX_INTERESTS));
  });

  it("returns [] for non-array input", () => {
    expect(sanitizeInterests("Café")).toEqual([]);
    expect(sanitizeInterests(undefined)).toEqual([]);
    expect(sanitizeInterests(null)).toEqual([]);
    expect(sanitizeInterests({ 0: "Café" })).toEqual([]);
  });
});
