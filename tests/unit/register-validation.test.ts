import { describe, expect, it } from "vitest";
import { registerSchema } from "@/lib/validations/auth";

const base = {
  name: "Ana Paula",
  email: "ana@example.com",
  password: "senha1234",
  phone: "11999998888",
  gender: "female" as const,
};

const parseBirth = (birthDate: string) =>
  registerSchema.safeParse({ ...base, birthDate });

describe("registerSchema birthDate calendar validation", () => {
  it.each(["1990-06-15", "2000-02-29", "1988-12-31", "1996-02-29"])(
    "accepts the real date %s",
    (d) => {
      expect(parseBirth(d).success).toBe(true);
    }
  );

  it.each([
    "1990-06-31", // June has 30 days
    "1991-02-29", // 1991 is not a leap year
    "1990-04-31", // April has 30 days
    "2000-13-01", // no month 13
    "2000-00-10", // no month 0
    "2000-01-32", // no day 32
  ])("rejects the calendar-invalid date %s (JS Date would roll it forward)", (d) => {
    expect(parseBirth(d).success).toBe(false);
  });
});
