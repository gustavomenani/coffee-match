import { describe, it, expect } from "vitest";
import {
  canVote,
  canViewResults,
  oppositeGender,
} from "@/lib/domain/eligibility";

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
