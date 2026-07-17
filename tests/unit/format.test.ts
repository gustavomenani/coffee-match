import { describe, expect, it } from "vitest";
import { formatBRL, toWhatsappUrl } from "@/lib/format";

describe("formatBRL", () => {
  it("renders cents as Brazilian currency", () => {
    // Non-breaking space between R$ and the number, pt-BR decimal comma.
    expect(formatBRL(4990)).toBe("R$ 49,90");
    expect(formatBRL(0)).toBe("R$ 0,00");
    expect(formatBRL(2500)).toBe("R$ 25,00");
  });
});

describe("toWhatsappUrl", () => {
  it("prefixes the 55 country code for a local mobile number", () => {
    // (11) 99999-8888 → 11 digits, no country code.
    expect(toWhatsappUrl("(11) 99999-8888")).toBe("https://wa.me/5511999998888");
  });

  it("prefixes the country code for a local landline", () => {
    // (11) 3333-4444 → 10 digits, no country code.
    expect(toWhatsappUrl("(11) 3333-4444")).toBe("https://wa.me/551133334444");
  });

  it("does NOT drop the DDD for a number in area code 55 (Rio Grande do Sul)", () => {
    // The whole reason this is length-based, not prefix-based. DDD 55 (Santa
    // Maria etc.) makes a local number start with "55" while having NO country
    // code. The old digits.startsWith("55") check treated it as already
    // country-coded and emitted wa.me/55999998888 — WhatsApp then read 55 as
    // the country and dropped the DDD. It must gain a country code, not lose one.
    expect(toWhatsappUrl("(55) 99999-8888")).toBe("https://wa.me/5555999998888");
    expect(toWhatsappUrl("(55) 3333-4444")).toBe("https://wa.me/555533334444");
  });

  it("leaves an already country-coded number untouched", () => {
    // +55 11 99999-8888 → 13 digits, keep as-is.
    expect(toWhatsappUrl("+55 11 99999-8888")).toBe("https://wa.me/5511999998888");
    // +55 55 99999-8888 (DDD 55 WITH country code) → 13 digits, keep as-is.
    expect(toWhatsappUrl("+55 55 99999-8888")).toBe("https://wa.me/5555999998888");
  });

  it("strips non-digit characters", () => {
    expect(toWhatsappUrl(" 11 9.9999-8888 ")).toBe("https://wa.me/5511999998888");
  });
});
