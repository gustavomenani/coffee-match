import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

/**
 * Next 16 renamed the `middleware` file convention to `proxy`; the old name is
 * deprecated (node_modules/next/dist/docs/01-app/03-api-reference/
 * 03-file-conventions/proxy.md).
 *
 * This is only a coarse redirect gate: it runs the DB-free authConfig
 * callbacks, so it checks that a JWT exists and claims the admin role, nothing
 * more. Every route under the matcher re-checks on the server — /admin/*
 * through requireAdminOrThrow, the participant pages through their own auth()
 * call — where the DB-backed jwt callback also enforces tokenVersion
 * revocation. A revoked JWT gets past this file and then reaches no data.
 *
 * Worth knowing for later: `proxy` runs on the Node.js runtime (edge is not
 * supported here), so the "middleware must not touch the DB" constraint that
 * split auth.config.ts out of auth.ts no longer applies. Kept as-is for now —
 * collapsing the split is a behaviour change, not a rename.
 */
export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    "/admin/:path*",
    "/minha-conta/:path*",
    "/meus-ingressos/:path*",
    "/meus-matches/:path*",
    "/evento/:path*",
  ],
};
