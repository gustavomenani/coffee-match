import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";
import { rateLimit } from "@/lib/rate-limit";
import { cleanEmail } from "@/lib/security/sanitize";
import { auditLog } from "@/lib/audit";

/** Valid bcrypt hash for timing-safe path when user missing (never a real password) */
const DUMMY_HASH =
  "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW";

export const MAX_FAILED = 5;
export const LOCK_MS = 15 * 60_000;

export type VerifiedUser = {
  id: string;
  email: string;
  name: string;
  role: "participant" | "admin";
};

/**
 * Credential check with brute-force protection.
 *
 * Throttling is keyed by IP and by IP+email, so an attacker cannot lock a
 * victim out just by knowing their e-mail. The DB lockout is "soft": it only
 * rejects wrong-password attempts — a correct password always logs in and
 * clears the counters. Trade-off: a large botnet is contained by the per-IP
 * limits rather than a hard account lock; a hard lock keyed by email alone
 * would hand any attacker a one-request account DoS.
 */
export async function verifyLogin(
  raw: unknown,
  ip: string
): Promise<VerifiedUser | null> {
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return null;

  const email = cleanEmail(parsed.data.email);
  const [byIp, byIpEmail] = await Promise.all([
    rateLimit(`login:ip:${ip}`, 30, 15 * 60_000),
    rateLimit(`login:${ip}:${email}`, 10, 15 * 60_000),
  ]);
  if (!byIp || !byIpEmail) {
    await auditLog({
      action: "auth.login_rate_limited",
      meta: { email, ip },
    });
    return null;
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Always run bcrypt to reduce timing oracle on email enumeration
  const hash = user?.passwordHash ?? DUMMY_HASH;
  const passwordOk = await bcrypt.compare(parsed.data.password, hash);

  if (!user) {
    await auditLog({
      action: "auth.login_failed",
      meta: { email, ip, reason: "unknown_user" },
    });
    return null;
  }

  const locked = !!user.lockedUntil && user.lockedUntil.getTime() > Date.now();

  if (!passwordOk) {
    if (locked) {
      await auditLog({
        actorId: user.id,
        action: "auth.login_locked",
        meta: { email, ip },
      });
      return null;
    }
    const failed = user.failedLoginCount + 1;
    const lockedUntil =
      failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MS) : null;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: failed,
        lockedUntil,
      },
    });
    await auditLog({
      actorId: user.id,
      action: "auth.login_failed",
      meta: { email, ip, failed, locked: !!lockedUntil },
    });
    return null;
  }

  if (user.failedLoginCount > 0 || user.lockedUntil) {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null },
    });
  }

  await auditLog({
    actorId: user.id,
    action: "auth.login_ok",
    meta: { email, ip },
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}
