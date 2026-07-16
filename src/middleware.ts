import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    "/admin/:path*",
    "/minha-conta/:path*",
    "/meus-ingressos/:path*",
    "/evento/:path*",
  ],
};
