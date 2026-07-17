import { describe, it, expect } from "vitest";
import {
  SUBSCRIPTION_PRICE_CENTS,
  canBuyDuringEarlyAccess,
  inEarlyAccessWindow,
  isSubscriberActive,
} from "@/lib/domain/subscription";

const now = new Date("2026-07-17T12:00:00Z");
const future = new Date("2026-07-18T12:00:00Z");
const past = new Date("2026-07-16T12:00:00Z");

describe("subscription domain", () => {
  it("price is R$10", () => {
    expect(SUBSCRIPTION_PRICE_CENTS).toBe(1000);
  });

  it("isSubscriberActive only for active status", () => {
    expect(isSubscriberActive({ status: "active" })).toBe(true);
    expect(isSubscriberActive({ status: "pending" })).toBe(false);
    expect(isSubscriberActive({ status: "cancelled" })).toBe(false);
    expect(isSubscriberActive(null)).toBe(false);
  });

  it("early-access window is open only before the deadline", () => {
    expect(inEarlyAccessWindow(future, now)).toBe(true);
    expect(inEarlyAccessWindow(past, now)).toBe(false);
    expect(inEarlyAccessWindow(null, now)).toBe(false);
    expect(inEarlyAccessWindow(undefined, now)).toBe(false);
  });

  it("during early access only subscribers can buy", () => {
    expect(canBuyDuringEarlyAccess(future, true, now)).toBe(true);
    expect(canBuyDuringEarlyAccess(future, false, now)).toBe(false);
  });

  it("after the window everyone can buy", () => {
    expect(canBuyDuringEarlyAccess(past, false, now)).toBe(true);
    expect(canBuyDuringEarlyAccess(null, false, now)).toBe(true);
  });
});
