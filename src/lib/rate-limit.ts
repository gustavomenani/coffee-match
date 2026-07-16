const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  if (
    process.env.E2E_DISABLE_RATE_LIMIT === "1" ||
    process.env.AUTH_SECRET?.includes("e2e-auth-secret")
  ) {
    return true;
  }

  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count += 1;
  return true;
}
