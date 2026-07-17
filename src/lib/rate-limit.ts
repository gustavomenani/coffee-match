import { prisma } from "@/lib/prisma";
import { logError, alertCritical } from "@/lib/observability";

type Bucket = { count: number; resetAt: number };

export type RateLimitOptions = {
  /**
   * Marks a security-critical brute-force gate (login, password reset). When the
   * Postgres counter path errors, these keys fall back to a STRICT per-instance
   * cap and page an operator, instead of silently degrading to the caller's full
   * limit. The in-memory fallback is not shared across serverless instances, so
   * on a DB outage it is the last line of defense — and since account lockout is
   * soft by design, it is the ONLY brute-force defense. Keep the fallback tight.
   */
  critical?: boolean;
};

/** Per-instance cap applied to critical keys when the DB counter is unavailable. */
const CRITICAL_FALLBACK_LIMIT = 5;

/** Throttle so a sustained DB outage cannot flood the alert channel. */
let lastFallbackAlert = 0;
function alertDbFallback(key: string, err: unknown): void {
  logError("rate_limit.db_fallback", err, { key });
  const now = Date.now();
  if (now - lastFallbackAlert >= 60_000) {
    lastFallbackAlert = now;
    alertCritical("rate_limit.db_fallback", {
      note: "rate-limit DB counter failing; brute-force defense degraded to per-instance memory",
    });
  }
}

/** In-memory fallback for when the DB is unreachable (best-effort per instance). */
const memoryBuckets = new Map<string, Bucket>();

/** Periodic cleanup to avoid unbounded growth (memory map + expired DB rows). */
let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, b] of memoryBuckets) {
    if (now > b.resetAt) memoryBuckets.delete(k);
  }
  // Fire-and-forget: expired rows are harmless, this just keeps the table small.
  prisma.rateLimitBucket
    .deleteMany({ where: { resetAt: { lt: new Date(now - 60_000) } } })
    .catch(() => {});
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
};

function memoryRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number
): RateLimitResult {
  const b = memoryBuckets.get(key);
  if (!b || now > b.resetAt) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, resetAt: now + windowMs };
  }
  if (b.count >= limit) {
    return { ok: false, remaining: 0, resetAt: b.resetAt };
  }
  b.count += 1;
  return { ok: true, remaining: limit - b.count, resetAt: b.resetAt };
}

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  opts?: RateLimitOptions
): Promise<boolean> {
  return (await rateLimitDetailed(key, limit, windowMs, opts)).ok;
}

/**
 * Fixed-window counter backed by Postgres so limits hold across
 * serverless/multi-instance deploys. Falls back to a per-instance
 * in-memory bucket if the DB write fails.
 */
export async function rateLimitDetailed(
  key: string,
  limit: number,
  windowMs: number,
  opts?: RateLimitOptions
): Promise<RateLimitResult> {
  if (
    process.env.E2E_DISABLE_RATE_LIMIT === "1" ||
    process.env.AUTH_SECRET?.includes("e2e-auth-secret")
  ) {
    return { ok: true, remaining: limit, resetAt: Date.now() + windowMs };
  }

  const now = Date.now();
  sweep(now);

  // Per-instance fallback limit: clamp critical keys hard, since memory is not
  // shared across serverless instances and the DB counter is what makes the
  // limit global.
  const fallbackLimit = opts?.critical
    ? Math.min(limit, CRITICAL_FALLBACK_LIMIT)
    : limit;

  try {
    // Single atomic upsert: start a new window when the old one expired,
    // otherwise increment the current counter.
    const rows = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
      INSERT INTO "RateLimitBucket" ("key", "count", "resetAt")
      VALUES (${key}, 1, ${new Date(now + windowMs)})
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE
          WHEN "RateLimitBucket"."resetAt" <= ${new Date(now)} THEN 1
          ELSE "RateLimitBucket"."count" + 1
        END,
        "resetAt" = CASE
          WHEN "RateLimitBucket"."resetAt" <= ${new Date(now)} THEN ${new Date(now + windowMs)}
          ELSE "RateLimitBucket"."resetAt"
        END
      RETURNING "count", "resetAt"
    `;
    const row = rows[0];
    if (!row) return memoryRateLimit(key, fallbackLimit, windowMs, now);
    return {
      ok: row.count <= limit,
      remaining: Math.max(0, limit - row.count),
      resetAt: row.resetAt.getTime(),
    };
  } catch (err) {
    // The DB counter is unavailable. Make this visible (silent degradation of
    // the only brute-force defense is the real danger), then fall back to
    // per-instance memory — clamped hard for critical keys.
    alertDbFallback(key, err);
    return memoryRateLimit(key, fallbackLimit, windowMs, now);
  }
}
