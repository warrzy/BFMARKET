import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
// Préproduction distante : E2E_BASE_URL=https://preprod... E2E_HTTP_USER / E2E_HTTP_PASSWORD (accès recette)
const REMOTE = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: REMOTE ? undefined : "./e2e/global-setup.ts",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: REMOTE ?? `http://localhost:${PORT}`,
    httpCredentials: process.env.E2E_HTTP_USER ? { username: process.env.E2E_HTTP_USER, password: process.env.E2E_HTTP_PASSWORD ?? "" } : undefined,
    trace: "off",
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : undefined,
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 5"], locale: "fr-FR" } },
  ],
  webServer: REMOTE ? undefined : {
    command: "./scripts/start-standalone.sh",
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { PORT: String(PORT), HOSTNAME: "127.0.0.1", OTP_CONSOLE_IN_PRODUCTION: "true", OTP_SHOW_ON_SCREEN: "true", APP_URL: `http://localhost:${PORT}`, DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://ecom:ecom@localhost:5432/ecom?schema=public" },
  },
});
