export type PaymentAmount = {
  transactionAmount: number | null | undefined;
  currencyId: string | null | undefined;
};

export type PricedEvent = {
  priceCents: number;
  currency: string;
};

/**
 * Defense in depth for the payment webhook: an "approved" payment only counts
 * when it charged the exact event price in the expected currency.
 */
export function isPaymentAmountValid(
  payment: PaymentAmount,
  event: PricedEvent
): boolean {
  if (typeof payment.transactionAmount !== "number") return false;
  if (!payment.currencyId || payment.currencyId !== event.currency) {
    return false;
  }
  return Math.round(payment.transactionAmount * 100) === event.priceCents;
}
