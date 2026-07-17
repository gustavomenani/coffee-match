import { describe, it, expect } from "vitest";
import { isPaymentAmountValid } from "@/lib/domain/payment";

const event = { priceCents: 4990, currency: "BRL" };

describe("isPaymentAmountValid", () => {
  it("accepts the exact price in the right currency", () => {
    expect(
      isPaymentAmountValid(
        { transactionAmount: 49.9, currencyId: "BRL" },
        event
      )
    ).toBe(true);
  });

  it("rejects a lower amount", () => {
    expect(
      isPaymentAmountValid(
        { transactionAmount: 0.01, currencyId: "BRL" },
        event
      )
    ).toBe(false);
  });

  it("rejects a higher amount (not the configured price)", () => {
    expect(
      isPaymentAmountValid(
        { transactionAmount: 100.0, currencyId: "BRL" },
        event
      )
    ).toBe(false);
  });

  it("rejects a different currency", () => {
    expect(
      isPaymentAmountValid(
        { transactionAmount: 49.9, currencyId: "USD" },
        event
      )
    ).toBe(false);
  });

  it("rejects missing amount or currency", () => {
    expect(
      isPaymentAmountValid({ transactionAmount: null, currencyId: "BRL" }, event)
    ).toBe(false);
    expect(
      isPaymentAmountValid(
        { transactionAmount: 49.9, currencyId: undefined },
        event
      )
    ).toBe(false);
  });

  it("is robust to float representation of the price", () => {
    // 0.1 + 0.2 style errors must not reject legit payments
    expect(
      isPaymentAmountValid(
        { transactionAmount: 3 * 0.1, currencyId: "BRL" },
        { priceCents: 30, currency: "BRL" }
      )
    ).toBe(true);
  });
});
