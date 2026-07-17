import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/lib/auth.config";
import { verifyLogin } from "@/lib/login";
import { clientIpFromHeaders } from "@/lib/security/ip";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
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
