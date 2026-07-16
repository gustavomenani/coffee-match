type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Periodic cleanup to avoid unbounded memory growth */
let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, b] of buckets) {
    if (now > b.resetAt) buckets.delete(k);
  }
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
};

/**
 * Sliding fixed-window counter. For multi-instance deploy, replace with Redis.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): boolean {
  return rateLimitDetailed(key, limit, windowMs).ok;
}

export function rateLimitDetailed(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  if (
    process.env.E2E_DISABLE_RATE_LIMIT === "1" ||
    process.env.AUTH_SECRET?.includes("e2e-auth-secret")
  ) {
    return { ok: true, remaining: limit, resetAt: Date.now() + windowMs };
  }

  const now = Date.now();
  sweep(now);
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, resetAt: now + windowMs };
  }
  if (b.count >= limit) {
    return { ok: false, remaining: 0, resetAt: b.resetAt };
  }
  b.count += 1;
  return { ok: true, remaining: limit - b.count, resetAt: b.resetAt };
}
