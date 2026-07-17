import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/observability";

/**
 * Best-effort audit trail. Never throws to callers — logging must not break UX.
 */
export async function auditLog(input: {
  actorId?: string | null;
  action: string;
  meta?: Prisma.InputJsonValue;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        meta: input.meta ?? undefined,
      },
    });
  } catch (err) {
    logError("audit.write_failed", err, { action: input.action });
  }
}
