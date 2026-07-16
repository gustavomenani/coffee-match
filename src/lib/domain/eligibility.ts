import type { Gender } from "./capacity";

export function oppositeGender(g: Gender): Gender {
  return g === "male" ? "female" : "male";
}

export function canVote(input: {
  ticketStatus: string;
  checkedIn: boolean;
  sessionStatus: string;
  hasWhatsapp: boolean;
}): boolean {
  return (
    input.ticketStatus === "paid" &&
    input.checkedIn &&
    input.sessionStatus === "voting_open" &&
    input.hasWhatsapp
  );
}

export function canViewResults(input: {
  ticketStatus: string;
  checkedIn: boolean;
  sessionStatus: string;
}): boolean {
  return (
    input.ticketStatus === "paid" &&
    input.checkedIn &&
    input.sessionStatus === "voting_closed"
  );
}
