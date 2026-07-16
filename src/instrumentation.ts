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
