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
 */
export function toWhatsappUrl(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}`;
}
