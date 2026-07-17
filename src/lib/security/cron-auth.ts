import { createHash, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";

/** Constant-time comparison that does not leak length differences. */
function secretMatches(provided: string, expected: string): boolean {
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/**
 * Shared auth gate for cron routes called by an external scheduler with
 * `Authorization: Bearer ${CRON_SECRET}` (see .env.example).
 *
 * Returns `null` when the request is authorized; otherwise returns the
 * error response the route must send (503 when CRON_SECRET is unset,
 * 401 for a missing/invalid token).
 */
export function requireCronAuth(req: Request): NextResponse | null {
  const secret = getEnv().CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET não configurado." },
      { status: 503 }
    );
  }

  const authorization = req.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;

  if (!token || !secretMatches(token, secret)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  return null;
}
