import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCronAuth } from "@/lib/security/cron-auth";

export const dynamic = "force-dynamic";

const RETENTION_MS = 90 * 24 * 60 * 60 * 1000; // 90 dias

/**
 * Deletes audit log entries older than 90 days (LGPD-friendly retention).
 * Meant to be called by an external scheduler with
 * `Authorization: Bearer ${CRON_SECRET}` (see .env.example).
 */
export async function GET(req: NextRequest) {
  const unauthorized = requireCronAuth(req);
  if (unauthorized) return unauthorized;

  const cutoff = new Date(Date.now() - RETENTION_MS);
  const { count } = await prisma.auditLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });

  return NextResponse.json({ deleted: count });
}
