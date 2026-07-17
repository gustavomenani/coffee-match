import type { Gender } from "./capacity";

export function oppositeGender(g: Gender): Gender {
  return g === "male" ? "female" : "male";
}

/**
 * Single definition of "has a WhatsApp we can reveal on a match" — the ballot
 * and the ticket page both gate on it and must agree.
 */
export function hasWhatsapp(phone: string | null | undefined): boolean {
  return !!phone?.trim();
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
