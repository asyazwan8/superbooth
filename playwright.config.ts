import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run the booth against the mock image provider and the local
 * disk store, so they need no FAL key and no Firebase project.
 *
 * PLAYWRIGHT_CHROMIUM_EXECUTABLE lets a machine with a pre-installed Chromium
 * (CI images, sandboxes) point at it instead of downloading a matching build.
 */
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "line" : "list",
  timeout: 90_000,

  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    // A booth without a camera cannot be tested; Chromium's synthetic device
    // stands in for one, and the permission is granted up front so no prompt
    // blocks the capture step.
    permissions: ["camera"],
    launchOptions: {
      ...(executablePath ? { executablePath } : {}),
      args: [
        "--use-fake-device-for-media-stream",
        "--use-fake-ui-for-media-stream",
        "--no-sandbox",
      ],
    },
  },

  projects: [
    {
      name: "kiosk",
      // A portrait viewport, matching the vertical screen the booth runs on.
      use: { ...devices["Desktop Chrome"], viewport: { width: 430, height: 932 } },
      testMatch: /booth\.spec\.ts/,
    },
    {
      name: "admin",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
      testMatch: /admin\.spec\.ts/,
    },
  ],

  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000/api/config",
        reuseExistingServer: true,
        timeout: 120_000,
        env: { FAL_MOCK: "1", ATTENDANT_PIN: "1234", APP_URL: "http://localhost:3000" },
      },
});
