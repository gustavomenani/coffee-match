/** Shared display formatters — previously copy-pasted across pages. */

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** Cents → "R$ 49,90". */
export function formatBRL(cents: number): string {
  return brl.format(cents / 100);
}

/**
 * A Brazilian phone → a wa.me deep link, prefixing the 55 country code when
 * absent. Non-digits are stripped. Shared by the matches action and page so the
 * revealed contact link is built one way.
 *
 * Disambiguate by LENGTH, not a "55" prefix. DDD 55 is a real Brazilian area
 * code (Rio Grande do Sul — Santa Maria, Santa Rosa…), so a local number there
 * like "(55) 99999-8888" becomes "55999998888" and STARTS with 55 while having
 * no country code. The old prefix check treated it as already country-coded and
 * emitted wa.me/55999998888 — WhatsApp then read "55" as the country and dropped
 * the DDD, silently breaking the revealed contact link, which is the product's
 * whole payoff. Brazilian numbers are 10–11 digits locally (DDD + 8/9-digit
 * number) and 12–13 digits with the 55 country code, so length disambiguates
 * cleanly where a prefix cannot.
 */
export function toWhatsappUrl(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const withCountry = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${withCountry}`;
}
