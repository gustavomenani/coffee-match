/**
 * Best-effort client IP for rate-limit keys. Behind a proxy/CDN the first
 * x-forwarded-for entry is the client; never treat this as authentication.
 */
export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 45);
  }
  const real = headers.get("x-real-ip");
  if (real) return real.trim().slice(0, 45);
  return "unknown";
}
