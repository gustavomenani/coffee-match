import { createHash, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

const RETENTION_MS = 90 * 24 * 60 * 60 * 1000; // 90 dias

/** Constant-time comparison that does not leak length differences. */
function secretMatches(provided: string, expected: string): boolean {
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/**
 * Deletes audit log entries older than 90 days (LGPD-friendly retention).
 * Meant to be called by an external scheduler with
 * `Authorization: Bearer ${CRON_SECRET}` (see .env.example).
 */
export async function GET(req: NextRequest) {
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

  const cutoff = new Date(Date.now() - RETENTION_MS);
  const { count } = await prisma.auditLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });

  return NextResponse.json({ deleted: count });
}
