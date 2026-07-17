import { describe, it, expect } from "vitest";
import {
  canVote,
  canViewResults,
  hasWhatsapp,
  oppositeGender,
} from "@/lib/domain/eligibility";

describe("hasWhatsapp", () => {
  // One definition, because the ballot and the ticket page both gate on it.
  // They used to derive it separately and the ticket page's copy simply left
  // this condition out, promising "Votação aberta" to users getBallot rejects.
  it("accepts a real number", () => {
    expect(hasWhatsapp("11999999999")).toBe(true);
  });

  it("rejects missing, empty and whitespace-only numbers", () => {
    expect(hasWhatsapp(null)).toBe(false);
    expect(hasWhatsapp(undefined)).toBe(false);
    expect(hasWhatsapp("")).toBe(false);
    expect(hasWhatsapp("   ")).toBe(false);
  });
});

describe("eligibility", () => {
  it("opposite gender", () => {
    expect(oppositeGender("male")).toBe("female");
    expect(oppositeGender("female")).toBe("male");
  });

  it("can vote only paid + checked in + voting open + whatsapp", () => {
    expect(
      canVote({
        ticketStatus: "paid",
        checkedIn: true,
        sessionStatus: "voting_open",
        hasWhatsapp: true,
      })
    ).toBe(true);
    expect(
      canVote({
        ticketStatus: "paid",
        checkedIn: false,
        sessionStatus: "voting_open",
        hasWhatsapp: true,
      })
    ).toBe(false);
  });

  it("can view results only after voting closed", () => {
    expect(
      canViewResults({
        ticketStatus: "paid",
        checkedIn: true,
        sessionStatus: "voting_closed",
      })
    ).toBe(true);
    expect(
      canViewResults({
        ticketStatus: "paid",
        checkedIn: true,
        sessionStatus: "voting_open",
      })
    ).toBe(false);
  });
});
