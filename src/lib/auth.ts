import { cache } from "react";
import NextAuth, { type Session } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/lib/auth.config";
import { prisma } from "@/lib/prisma";
import { verifyLogin } from "@/lib/login";
import { clientIpFromHeaders } from "@/lib/security/ip";

const nextAuth = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    /**
     * Node-side JWT check with session versioning: password reset bumps
     * User.tokenVersion, so any JWT minted before it is rejected here.
     * The coarse route gate in proxy.ts (Next 16's renamed middleware, running
     * on the Node runtime) keeps using the DB-free authConfig callbacks —
     * every server-side auth() call (pages, actions, routes) enforces this
     * tokenVersion check, which the proxy gate deliberately does not.
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

export const { handlers, signIn, signOut } = nextAuth;

/**
 * Request-deduplicated session read.
 *
 * next-auth v5 does not wrap `auth()` in React's cache(), and the jwt callback
 * above hits the database on every call to enforce tokenVersion. The root
 * layout awaits auth() for the dock, then renders <Header/> which awaits it
 * again, then the page awaits it a third time — three identical user lookups
 * per request, plus another inside requireUser. React cache() collapses them
 * into one per request; every call site uses the zero-argument form.
 */
export const auth = cache(
  nextAuth.auth as unknown as () => Promise<Session | null>
);
