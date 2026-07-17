import type { Instrumentation } from "next";

/**
 * Runs once when the Next.js server starts.
 * Validates critical production env so misconfig fails loud, not silent.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;

  try {
    const { getEnv } = await import("@/lib/env");
    // Soft-validate: getEnv throws hard only on production misconfig
    if (process.env.NODE_ENV === "production") {
      getEnv();
      console.info("[boot] production env validated");
    }
  } catch (err) {
    console.error("[boot] env validation failed", err);
    if (process.env.NODE_ENV === "production") {
      throw err;
    }
  }
}

/**
 * Central sink for every uncaught server error — route handlers, server
 * actions, Server Component renders. Previously an uncaught throw in the
 * Mercado Pago webhook or a server action just produced a default 500 with no
 * structured record; this gives all of them one searchable shape and the one
 * place to forward to Sentry/Datadog later.
 */
export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
  context
) => {
  const { logError } = await import("@/lib/observability");
  logError("request.unhandled_error", err, {
    path: request.path,
    method: request.method,
    routeType: context.routeType,
    routePath: context.routePath,
  });
};
