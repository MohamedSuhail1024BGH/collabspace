import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3001",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // Pre-seed cookie consent for every context: the global CookieBanner mounts
    // after 800ms on a fresh origin and its z-50 dialog intercepts pointer
    // events, which otherwise stalls every click-based assertion.
    storageState: {
      cookies: [],
      origins: [
        {
          origin: "http://127.0.0.1:3001",
          localStorage: [
            { name: "collabspace_cookie_consent_choice", value: "all_accepted" },
          ],
        },
      ],
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run start -- -p 3001",
    url: "http://127.0.0.1:3001",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});

