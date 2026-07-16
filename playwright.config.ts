import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL,
    ...devices["Desktop Chrome"],
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      DATABASE_URL:
        process.env.DATABASE_URL ??
        "postgresql://postgres:postgres@localhost:5437/speeddate?schema=public",
      MERCADOPAGO_ACCESS_TOKEN:
        process.env.MERCADOPAGO_ACCESS_TOKEN ?? "TEST-DEV-BYPASS",
      AUTH_SECRET:
        process.env.AUTH_SECRET ??
        "e2e-auth-secret-speeddate-br-dev-only-32chars",
      AUTH_URL: process.env.AUTH_URL ?? baseURL,
      AUTH_TRUST_HOST: "true",
      E2E_DISABLE_RATE_LIMIT: "1",
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? baseURL,
    },
  },
});
