import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/lib/auth.config";
import { prisma } from "@/lib/prisma";
import { verifyLogin } from "@/lib/login";
import { clientIpFromHeaders } from "@/lib/security/ip";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    /**
     * Node-side JWT check with session versioning: password reset bumps
     * User.tokenVersion, so any JWT minted before it is rejected here.
     * The edge middleware keeps using the DB-free authConfig callbacks —
     * every server-side auth() call (pages, actions, routes) enforces this.
     */
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
        token.tv = (user as { tokenVersion?: number }).tokenVersion ?? 0;
        return token;
      }

      const userId = typeof token.id === "string" ? token.id : null;
      if (userId) {
        const db = await prisma.user.findUnique({
          where: { id: userId },
          select: { tokenVersion: true, role: true },
        });
        const tv = typeof token.tv === "number" ? token.tv : 0;
        if (!db || db.tokenVersion !== tv) {
          // Invalidate: user gone or password was reset after sign-in.
          return null;
        }
        token.role = db.role;
      }
      return token;
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(raw, request) {
        const ip = clientIpFromHeaders(request.headers);
        return verifyLogin(raw, ip);
      },
    }),
  ],
});
