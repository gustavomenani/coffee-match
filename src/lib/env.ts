import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(16),
  AUTH_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  MERCADOPAGO_ACCESS_TOKEN: z.string().optional(),
  MERCADOPAGO_WEBHOOK_SECRET: z.string().optional(),
  /** Bearer token required by the /api/cron/* routes (503 when unset). */
  CRON_SECRET: z.string().min(16).optional(),
  /**
   * Incoming-webhook URL (Slack/Discord/generic) that receives CRITICAL money
   * anomalies via alertCritical(). Optional — when unset, alerts fall back to
   * error-level log lines only.
   */
  ALERT_WEBHOOK_URL: z.string().url().optional(),
  /** Only honored when NODE_ENV !== production */
  ALLOW_DEV_BYPASS: z
    .enum(["0", "1", "true", "false"])
    .optional()
    .transform((v) => v === "1" || v === "true"),
  E2E_DISABLE_RATE_LIMIT: z.string().optional(),
  /** Web Push (VAPID). Gere o par com: npx web-push generate-vapid-keys */
  VAPID_PUBLIC_KEY: z.string().min(32).optional(),
  VAPID_PRIVATE_KEY: z.string().min(32).optional(),
  /** Contato do emissor exigido pelo protocolo: "mailto:..." ou URL https. */
  VAPID_SUBJECT: z
    .string()
    .refine(
      (v) => v.startsWith("mailto:") || v.startsWith("https://"),
      "VAPID_SUBJECT deve ser mailto: ou URL https"
    )
    .optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

let cached: AppEnv | null = null;

/** Validate env once. Throws on invalid production config. */
export function getEnv(): AppEnv {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join("; ");
    throw new Error(`Invalid environment: ${msg}`);
  }
  const env = parsed.data;

  if (env.NODE_ENV === "production") {
    if (!env.MERCADOPAGO_ACCESS_TOKEN) {
      throw new Error("MERCADOPAGO_ACCESS_TOKEN is required in production");
    }
    // Fail closed at boot, like every other critical secret. Otherwise a deploy
    // missing this boots fine and then 500s EVERY webhook — payments capture but
    // tickets never flip to paid, and it's only discovered after the first sale.
    if (!env.MERCADOPAGO_WEBHOOK_SECRET) {
      throw new Error(
        "MERCADOPAGO_WEBHOOK_SECRET is required in production — webhook signatures cannot be verified without it."
      );
    }
    // vercel.json unconditionally schedules expire-pending/event-reminders/
    // cleanup-audit, and requireCronAuth 503s when CRON_SECRET is unset. Missing
    // it means every cron silently 503s — pending tickets never expire (freezing
    // capacity), reminders never send, audit rows never prune — with no error
    // until someone notices the symptom. Fail closed like the other secrets.
    if (!env.CRON_SECRET) {
      throw new Error(
        "CRON_SECRET is required in production — every scheduled cron 503s without it."
      );
    }
    if (
      env.MERCADOPAGO_ACCESS_TOKEN.startsWith("TEST-DEV-BYPASS") ||
      env.ALLOW_DEV_BYPASS
    ) {
      throw new Error(
        "Dev payment bypass is forbidden in production. Set a real Mercado Pago token."
      );
    }
    if (env.AUTH_SECRET.includes("change-me") || env.AUTH_SECRET.length < 32) {
      throw new Error("AUTH_SECRET must be a strong secret (32+ chars) in production");
    }
    // Two ways to silently disable EVERY rate limit — the only brute-force
    // protection the app has, since the account lockout is soft by design.
    // Both were unguarded here while every other dev bypass was rejected.
    // Matches the exact value rate-limit.ts acts on, so a harmless "0" does not
    // block a deploy.
    if (env.E2E_DISABLE_RATE_LIMIT === "1") {
      throw new Error(
        "E2E_DISABLE_RATE_LIMIT is forbidden in production — it disables every rate limit."
      );
    }
    // src/lib/rate-limit.ts turns itself off when the SECRET VALUE contains
    // this, so copying the CI secret to production would remove all limits with
    // no other symptom.
    if (env.AUTH_SECRET.includes("e2e-auth-secret")) {
      throw new Error(
        "AUTH_SECRET contains the e2e test marker, which disables every rate limit. Generate a real secret."
      );
    }
    // appBaseUrl() falls back to http://localhost:3000, which would silently
    // ship that host inside password-reset links, ticket QR links and Mercado
    // Pago back_urls — broken, and only discovered after the first e-mail.
    if (!env.NEXT_PUBLIC_APP_URL && !env.AUTH_URL) {
      throw new Error(
        "NEXT_PUBLIC_APP_URL (or AUTH_URL) is required in production — e-mail links and payment returns are built from it."
      );
    }
  }

  cached = env;
  return env;
}

export function isProduction(): boolean {
  return (process.env.NODE_ENV ?? "development") === "production";
}

export function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.AUTH_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}
