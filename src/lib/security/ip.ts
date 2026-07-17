/**
 * Client IP for rate-limit keys. Never treat this as authentication.
 *
 * x-forwarded-for is APPEND-only: each proxy adds the address it received the
 * connection from, so the chain reads `client, proxy1, proxy2` and everything
 * to the LEFT of our own infrastructure is attacker-supplied. Taking entry [0]
 * meant a client sending `X-Forwarded-For: 1.2.3.4` produced `1.2.3.4, <real>`
 * and we keyed the limit on their forged value — rotate the header and you get
 * a fresh bucket per request. That matters here because the per-IP limits are
 * the only real brute-force protection on login: the account lockout is soft by
 * design (a correct password always logs in, so a hard lock can't be used to
 * DoS an account), which means it does not slow guessing down at all.
 *
 * It also let an attacker set the header to a victim's IP and burn their
 * bucket, locking them out of login for 15 minutes.
 *
 * So: count from the RIGHT. With TRUSTED_PROXY_HOPS proxies between the client
 * and this app, the real client sits at `length - hops`; forged entries pile up
 * to its left and are ignored.
 *
 * Default 1 is correct for Vercel (which overwrites the header with the true
 * client IP) and for a single nginx using proxy_add_x_forwarded_for. Add a hop
 * for each extra proxy you terminate behind (e.g. Cloudflare in front of nginx
 * would be 2). Too high is safe-but-blunt (you key on a shared proxy IP and
 * over-throttle); too low is exploitable.
 */
const DEFAULT_TRUSTED_PROXY_HOPS = 1;

function trustedProxyHops(): number {
  const raw = process.env.TRUSTED_PROXY_HOPS;
  if (!raw) return DEFAULT_TRUSTED_PROXY_HOPS;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 1) return DEFAULT_TRUSTED_PROXY_HOPS;
  return parsed;
}

const IPV4_RE = /^\d{1,3}(\.\d{1,3}){3}$/;

/** Loose shape check — enough to reject free text used as a key namespace. */
function looksLikeIp(value: string): boolean {
  if (IPV4_RE.test(value)) {
    return value.split(".").every((o) => Number(o) <= 255);
  }
  // IPv6: hex groups and colons only, and at least one colon.
  return value.includes(":") && /^[0-9a-fA-F:.]+$/.test(value);
}

export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const chain = forwarded
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (chain.length > 0) {
      // Clamp: a chain shorter than the configured hop count means the request
      // did not come through the expected proxies. Falling back to [0] there
      // would reintroduce the spoof, so take the leftmost only when that IS the
      // whole chain.
      const index = Math.max(0, chain.length - trustedProxyHops());
      const candidate = chain[index];
      if (candidate && looksLikeIp(candidate)) return candidate.slice(0, 45);
    }
  }

  const real = headers.get("x-real-ip")?.trim();
  if (real && looksLikeIp(real)) return real.slice(0, 45);

  return "unknown";
}
