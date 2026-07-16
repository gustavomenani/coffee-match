import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
import { loginSchema } from "@/lib/validations/auth";
import { rateLimitDetailed } from "@/lib/rate-limit";
import { cleanEmail } from "@/lib/security/sanitize";
import { auditLog } from "@/lib/audit";

/** Valid bcrypt hash for timing-safe path when user missing (never a real password) */
const DUMMY_HASH =
  "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW";

const MAX_FAILED = 5;
const LOCK_MS = 15 * 60_000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;

        const email = cleanEmail(parsed.data.email);
        const rl = rateLimitDetailed(`login:${email}`, 20, 15 * 60_000);
        if (!rl.ok) return null;

        const user = await prisma.user.findUnique({ where: { email } });

        // Always run bcrypt to reduce timing oracle on email enumeration
        const hash = user?.passwordHash ?? DUMMY_HASH;
        const passwordOk = await bcrypt.compare(parsed.data.password, hash);

        if (!user) {
          await auditLog({
            action: "auth.login_failed",
            meta: { email, reason: "unknown_user" },
          });
          return null;
        }

        if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
          await auditLog({
            actorId: user.id,
            action: "auth.login_locked",
            meta: { email },
          });
          return null;
        }

        if (!passwordOk) {
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
            meta: { email, failed, locked: !!lockedUntil },
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
          meta: { email },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
});
