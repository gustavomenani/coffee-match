export const SUBSCRIPTION_PRICE_CENTS = 1000;

export type SubscriptionLike = {
  status: string;
} | null;

export function isSubscriberActive(sub: SubscriptionLike): boolean {
  return sub?.status === "active";
}

/** True while the event is in its subscriber-only early-access window. */
export function inEarlyAccessWindow(
  earlyAccessUntil: Date | null | undefined,
  now: Date = new Date()
): boolean {
  return !!earlyAccessUntil && now.getTime() < earlyAccessUntil.getTime();
}

/**
 * Sales gate: during the early-access window only active subscribers buy;
 * outside the window everyone can.
 */
export function canBuyDuringEarlyAccess(
  earlyAccessUntil: Date | null | undefined,
  isSubscriber: boolean,
  now: Date = new Date()
): boolean {
  if (!inEarlyAccessWindow(earlyAccessUntil, now)) return true;
  return isSubscriber;
}
