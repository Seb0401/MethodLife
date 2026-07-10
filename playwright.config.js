// CommonJS config so it loads without a TS transform on older Node (the project
// tsconfig targets ESM, which trips Playwright's config loader on Node < 20.6).
const { defineConfig, devices } = require("@playwright/test");
const dotenv = require("dotenv");

// E2E credentials (two pre-created Supabase users) live in .env.test (git-ignored).
// The dev server loads .env/.env.local itself.
dotenv.config({ path: ".env.test" });

const BASE_URL = "http://localhost:3000";

module.exports = defineConfig({
  testDir: "./e2e",
  // Plain CommonJS JS files: Playwright 1.61 needs Node's native TS support
  // (Node >= 20.6/22) to load .ts tests, which this environment lacks. JS runs
  // with no transform on any Node. The .e2e.js name also keeps Vitest away.
  testMatch: "**/*.e2e.js",
  // Tests share one real Supabase database, so run them serially.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  // Retry once even locally: the app talks to a remote Supabase over the network,
  // so an occasional socket timeout shouldn't fail the whole run.
  retries: 1,
  reporter: process.env.CI ? "list" : [["list"], ["html", { open: "never" }]],
  timeout: 120_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Run against a production build: everything is precompiled, so tests don't
    // race the dev server's on-demand compilation. Reuses a server already on
    // :3000 if you have one running.
    command: "pnpm build && pnpm start",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
