import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Production containers run UTC; a dev box in America/Sao_Paulo hides every
    // bug where code reads the server's local calendar day instead of APP_TZ.
    // Pin the suite to the production zone so those surface here, not at 21:00
    // on an event night.
    env: { TZ: "UTC" },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
