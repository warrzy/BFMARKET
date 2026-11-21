import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "off",
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : undefined,
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 5"], locale: "fr-FR" } },
  ],
  webServer: {
    command: "./scripts/start-standalone.sh",
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { PORT: String(PORT), HOSTNAME: "127.0.0.1", OTP_CONSOLE_IN_PRODUCTION: "true", OTP_SHOW_ON_SCREEN: "true", APP_URL: `http://localhost:${PORT}`, DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://ecom:ecom@localhost:5432/ecom?schema=public" },
  },
});
