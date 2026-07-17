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
