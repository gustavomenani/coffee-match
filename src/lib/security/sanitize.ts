/** Strip control chars and trim; max length. */
export function cleanText(raw: string, max = 200): string {
  return raw
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);
}

/** Digits-only phone, keep leading + optionally. */
export function cleanPhone(raw: string): string {
  const t = raw.trim();
  const plus = t.startsWith("+") ? "+" : "";
  return plus + t.replace(/\D/g, "").slice(0, 15);
}

export function cleanInstagram(raw: string): string | null {
  const t = raw.trim().replace(/^@/, "").toLowerCase();
  if (!t) return null;
  if (!/^[a-z0-9._]{1,30}$/.test(t)) return null;
  return t;
}

export function cleanEmail(raw: string): string {
  return raw.trim().toLowerCase().slice(0, 200);
}
