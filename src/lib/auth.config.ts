import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    // Shorter sessions reduce window if role is demoted in DB
    maxAge: 8 * 60 * 60,
    updateAge: 60 * 60,
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const path = request.nextUrl.pathname;
      const isLoggedIn = !!auth?.user;
      const isAdminRoute = path.startsWith("/admin");
      const isProtected =
        path.startsWith("/minha-conta") ||
        path.startsWith("/meus-ingressos") ||
        path.startsWith("/evento/") ||
        isAdminRoute;

      if (isProtected && !isLoggedIn) return false;
      if (isAdminRoute && auth?.user?.role !== "admin") return false;
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
