import { defineConfig, devices } from "@playwright/test";

// When E2E_BASE_URL is set the app is already served (the composed stack in CI),
// so Playwright must not start a dev server of its own.
const EXTERNAL_APP = Boolean(process.env.E2E_BASE_URL);
const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:5173";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  // One worker: every project shares the same database, so parallel runs would
  // race on the data they create.
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: EXTERNAL_APP
    ? undefined
    : {
        command: "npm run dev",
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 60_000,
      },
});
